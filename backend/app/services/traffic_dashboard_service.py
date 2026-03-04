# app/services/dashboard_service.py
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch

from src.core.config import settings
from app.models.models import AttackLog, AttackTraffic


class TrafficDashboardService:
    """
    대시보드에 필요한 데이터를 조회하고 가공하는 비즈니스 로직을 담당합니다.
    """
    async def get_overall_traffic_stats(self, es: AsyncElasticsearch) -> Dict[str, Any]:
        """
        대시보드용 실시간 통계와 '최신 데이터의 시간'을 함께 반환합니다.
        """
        # 반환할 결과값에 latest_data_timestamp 키 추가
        results = {
            "total_packets": 0,
            "total_bytes": 0,
            "last_second_packets": 0,
            "last_second_bytes": 0,
            "latest_data_timestamp": None
        }

        try:
            # --- 1. 전체 기간의 누적 통계 계산 ---
            total_stats_query = {
                "size": 0,
                "aggs": {
                    "total_fwd_packets": {"sum": {"field": "source.packets"}},
                    "total_bwd_packets": {"sum": {"field": "destination.packets"}},
                    "total_fwd_bytes": {"sum": {"field": "source.bytes"}},
                    "total_bwd_bytes": {"sum": {"field": "destination.bytes"}}
                }
            }
            total_response = await es.search(index=settings.es_index_packetbeat, body=total_stats_query, request_timeout=60)
            aggs = total_response['aggregations']
            
            results["total_packets"] = int((aggs['total_fwd_packets'].get('value', 0) or 0) + (aggs['total_bwd_packets'].get('value', 0) or 0))
            results["total_bytes"] = int((aggs['total_fwd_bytes'].get('value', 0) or 0) + (aggs['total_bwd_bytes'].get('value', 0) or 0))


            # --- 2. 가장 최근 1초 구간의 실시간 통계 계산 ---
            latest_doc_query = {"size": 1, "sort": [{"@timestamp": "desc"}]}
            latest_doc_response = await es.search(index=settings.es_index_packetbeat, body=latest_doc_query)

            if not latest_doc_response['hits']['hits']:
                return results

            # 최신 데이터의 타임스탬프를 가져옴
            latest_timestamp_str = latest_doc_response['hits']['hits'][0]['_source']['@timestamp']
            
            # 결과 딕셔너리에 최신 데이터의 타임스탬프를 저장
            results["latest_data_timestamp"] = latest_timestamp_str

            end_time = datetime.fromisoformat(latest_timestamp_str.replace('Z', '+00:00'))
            start_time = end_time - timedelta(seconds=1)
            
            last_second_query = {
                "size": 0,
                "query": {"range": {"@timestamp": {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}},
                "aggs": {
                    "fwd_packets": {"sum": {"field": "source.packets"}},
                    "bwd_packets": {"sum": {"field": "destination.packets"}},
                    "fwd_bytes": {"sum": {"field": "source.bytes"}},
                    "bwd_bytes": {"sum": {"field": "destination.bytes"}}
                }
            }
            last_second_response = await es.search(index=settings.es_index_packetbeat, body=last_second_query)
            aggs_last_sec = last_second_response['aggregations']

            results["last_second_packets"] = int((aggs_last_sec['fwd_packets'].get('value', 0) or 0) + (aggs_last_sec['bwd_packets'].get('value', 0) or 0))
            results["last_second_bytes"] = int((aggs_last_sec['fwd_bytes'].get('value', 0) or 0) + (aggs_last_sec['bwd_bytes'].get('value', 0) or 0))

            return results

        except Exception as e:
            print(f"❌ ES 대시보드 통계 조회 실패: {e}", flush=True)
            return results
        
    async def get_traffic_over_time(self, es: AsyncElasticsearch, seconds: int = 30) -> Dict[str, List]:
        """
        가장 최신 데이터를 기준으로 시간대별 트래픽 정보를 조회합니다.
        """
        try:
            # --- 1. 기준 시간 설정을 위해 가장 최신 데이터의 타임스탬프 조회 ---
            # size: 1, sort: desc => 최신 데이터 1건만 가져오는 쿼리
            latest_doc_query = {"size": 1, "sort": [{"@timestamp": "desc"}]}
            latest_doc_response = await es.search(index=settings.es_index_packetbeat, body=latest_doc_query)

            # ES에 데이터가 한 건도 없으면 빈 결과를 반환하고 함수 종료
            if not latest_doc_response['hits']['hits']:
                print("저장된 데이터가 전혀 없습니다.")
                return {"timestamps": [], "packets_per_second": [], "bytes_per_second": []}
            
            # --- 2. 조회할 시간 범위 계산 ---
            # 조회된 최신 데이터의 타임스탬프를 'end_time'으로 설정
            latest_timestamp_str = latest_doc_response['hits']['hits'][0]['_source']['@timestamp']
            # 'Z'를 파이썬 datetime 객체가 인식할 수 있는 '+00:00'으로 변경하여 파싱
            end_time = datetime.fromisoformat(latest_timestamp_str.replace('Z', '+00:00'))
            # end_time에서 'seconds' (기본 30초) 만큼 이전 시간을 'start_time'으로 설정
            start_time = end_time - timedelta(seconds=seconds)

            # --- 3. Elasticsearch에 보낼 집계(Aggregation) 쿼리 작성 ---
            query = {
                "size": 0,  # 실제 데이터(documents)는 필요 없으므로 0으로 설정하여 성능 최적화
                "query": {
                    "range": {  # 위에서 계산한 시간 범위 내의 데이터만 필터링
                        "@timestamp": {
                            "gte": start_time.isoformat(), # gte: Greater than or equal to
                            "lte": end_time.isoformat()    # lte: Less than or equal to
                        }
                    }
                },
                "aggs": {  # 데이터를 집계하는 부분
                    "traffic_over_time": {
                        "date_histogram": {  # 시간대별로 데이터를 그룹화(버킷 생성)
                            "field": "@timestamp",       # 기준 필드는 @timestamp
                            "fixed_interval": "1s",      # 1초 간격으로 버킷을 나눔
                            "min_doc_count": 0,          # 데이터가 없는 시간대도 빈 버킷으로 표시
                            "extended_bounds": {         # 데이터 유무와 상관없이 전체 시간 범위를 강제로 표시
                                "min": start_time.isoformat(),
                                "max": end_time.isoformat()
                            }
                        },
                        "aggs": {  # 각 1초 버킷 안에서 수행할 하위 집계
                            # source -> destination 패킷 수 합계
                            "fwd_packets": {"sum": {"field": "source.packets"}},
                            # destination -> source 패킷 수 합계
                            "bwd_packets": {"sum": {"field": "destination.packets"}},
                            # source -> destination 바이트 수 합계
                            "fwd_bytes": {"sum": {"field": "source.bytes"}},
                            # destination -> source 바이트 수 합계
                            "bwd_bytes": {"sum": {"field": "destination.bytes"}}
                        }
                    }
                }
            }
            
            # --- 4. 쿼리 실행 및 결과 파싱 ---
            response = await es.search(index=settings.es_index_packetbeat, body=query)
            # 집계 결과에서 'buckets' (1초 간격의 각 시간대별 데이터 묶음) 리스트를 가져옴
            buckets = response['aggregations']['traffic_over_time']['buckets']

            # 각 버킷에서 필요한 데이터를 추출하여 리스트로 만듦
            timestamps = [b['key_as_string'] for b in buckets] # 타임스탬프 리스트
            # 초당 전체 패킷 수 (송신 패킷 + 수신 패킷)
            packets_per_sec = [(b['fwd_packets'].get('value', 0) or 0) + (b['bwd_packets'].get('value', 0) or 0) for b in buckets]
            # 초당 전체 바이트 수 (송신 바이트 + 수신 바이트)
            bytes_per_sec = [(b['fwd_bytes'].get('value', 0) or 0) + (b['bwd_bytes'].get('value', 0) or 0) for b in buckets]
            
            # --- 5. 최종 결과 반환 ---
            # 프론트엔드에서 사용하기 좋은 형태로 데이터를 정리하여 반환
            return {
                "timestamps": timestamps,
                "packets_per_second": packets_per_sec,
                "bytes_per_second": bytes_per_sec
            }
        except Exception as e:
            # 오류 발생 시 로그를 남기고 빈 데이터를 반환하여 서비스 중단을 방지
            print(f"❌ ES 시계열 트래픽 조회 실패: {e}", flush=True)
            return {"timestamps": [], "packets_per_second": [], "bytes_per_second": []}

    async def get_top_ports(self, es: AsyncElasticsearch, top_n: int = 30, minutes: int = 5) -> List[Dict[str, Any]]:
        """
        지정된 시간(분) 동안의 상위 포트를 반환합니다.
        """
        try:
            # 파라미터로 받은 'minutes'를 사용하여 동적으로 시간 범위를 설정
            query = {
                "size": 0,
                "query": {"range": {"@timestamp": {"gte": f"now-{minutes}m"}}},
                "aggs": {"top_ports_recent": {"terms": {"field": "destination.port", "size": top_n, "order": {"_count": "desc"}}}}
            }
            response = await es.search(index=settings.es_index_packetbeat, body=query)
            buckets = response['aggregations']['top_ports_recent']['buckets']
            
            # 이제 단일 목록만 반환
            return [{"port": b['key'], "count": b['doc_count']} for b in buckets]
        
        except Exception as e:
            print(f"❌ ES 상위 포트 집계 실패: {e}", flush=True)
            return []


    async def get_all_attacks(self, db: AsyncSession, limit: int = 200) -> Dict[str, Any]:
        """
        AttackTraffic 테이블에서 추천된 6개 컬럼만 조회하고, 전체 카운트를 함께 반환합니다.
        """
        results = {
            "attacks_list": [],
            "count_all_time": 0
        }
        try:
            # 1. AttackTraffic 테이블에서 추천된 6개 컬럼만 조회 (최신순, limit 적용)
            stmt = select(
                AttackTraffic.timestamp,
                AttackTraffic.src_ip,
                AttackTraffic.dst_port,
                AttackTraffic.protocol,
                AttackTraffic.flow_pkts_per_s,
                AttackTraffic.flow_byts_per_s
            ).order_by(AttackTraffic.timestamp.desc()).limit(limit)
            
            attack_traffic_rows = await db.execute(stmt)
            
            # 조회 결과를 딕셔너리의 리스트 형태로 변환
            # (각 컬럼 이름을 키로 가짐)
            results["attacks_list"] = [dict(row) for row in attack_traffic_rows.mappings().all()]

            # 2. '전체 기간' 동안의 공격 트래픽 횟수를 집계
            traffic_count_stmt = select(func.count(AttackTraffic.traffic_id))
            traffic_count = await db.scalar(traffic_count_stmt)
            results["count_all_time"] = traffic_count

            return results
        except Exception as e:
            await db.rollback()
            print(f"❌ DB 공격 로그 조회 실패: {e}", flush=True)
            return results

# 서비스 인스턴스 생성
traffic_dashboard_service = TrafficDashboardService()