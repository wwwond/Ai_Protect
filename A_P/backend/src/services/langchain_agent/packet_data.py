# app/services/packet_data.py
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch, NotFoundError

from src.core.config import settings
from app.models.models import AttackTraffic


class TrafficDashboardService:
    """
    대시보드와 LLM 에이전트가 사용할 트래픽 데이터를 조회하고 가공하는 비즈니스 로직을 담당합니다.
    모든 함수는 user_id와 time_range를 기준으로 개인화된 데이터를 반환합니다.
    """

    async def get_overall_traffic_stats(self, es: AsyncElasticsearch, user_id: str, time_range: str = "24h") -> Dict[str, Any]:
        """
        특정 사용자의 지정된 시간 범위 내 전체 트래픽 통계를 반환합니다.
        """
        results = {
            "total_packets": 0,
            "total_bytes": 0,
            "latest_data_timestamp": None
        }
        try:
            query_filter = [
                {"match": {"user_id": user_id}},
                {"range": {"@timestamp": {"gte": f"now-{time_range}"}}}
            ]

            total_stats_query = {
                "size": 0,
                "query": {"bool": {"filter": query_filter}},
                "aggs": {
                    "total_fwd_packets": {"sum": {"field": "source.packets"}},
                    "total_bwd_packets": {"sum": {"field": "destination.packets"}},
                    "total_fwd_bytes": {"sum": {"field": "source.bytes"}},
                    "total_bwd_bytes": {"sum": {"field": "destination.bytes"}}
                }
            }
            total_response = await es.search(index=settings.es_index_packetbeat, body=total_stats_query, request_timeout=60)
            aggs = total_response.get('aggregations', {})
            
            results["total_packets"] = int((aggs.get('total_fwd_packets', {}).get('value', 0) or 0) + (aggs.get('total_bwd_packets', {}).get('value', 0) or 0))
            results["total_bytes"] = int((aggs.get('total_fwd_bytes', {}).get('value', 0) or 0) + (aggs.get('total_bwd_bytes', {}).get('value', 0) or 0))

            latest_doc_query = {
                "size": 1,
                "query": {"bool": {"filter": query_filter}},
                "sort": [{"@timestamp": "desc"}]
            }
            latest_doc_response = await es.search(index=settings.es_index_packetbeat, body=latest_doc_query)

            if latest_doc_response['hits']['hits']:
                results["latest_data_timestamp"] = latest_doc_response['hits']['hits'][0]['_source']['@timestamp']

            return results
        except NotFoundError:
             print(f"Index {settings.es_index_packetbeat} not found. Returning empty stats.")
             return results
        except Exception as e:
            print(f"❌ ES 전체 트래픽 통계 조회 실패 (User: {user_id}): {e}", flush=True)
            return results
            
    async def get_traffic_over_time(self, es: AsyncElasticsearch, user_id: str, time_range: str = "30m") -> Dict[str, List]:
        """
        [수정됨] 특정 사용자의 시간대별 트래픽 정보를 조회합니다. 데이터가 없으면 빈 결과를 반환합니다.
        """
        empty_result = {"timestamps": [], "packets_per_second": [], "bytes_per_second": []}
        try:
            # [핵심 수정] 먼저 해당 기간에 데이터가 있는지 확인합니다.
            check_query = {
                "query": {
                    "bool": {
                        "filter": [
                            {"match": {"user_id": user_id}},
                            {"range": {"@timestamp": {"gte": f"now-{time_range}", "lte": "now"}}}
                        ]
                    }
                }
            }
            count_response = await es.count(index=settings.es_index_packetbeat, body=check_query)
            if count_response.get('count', 0) == 0:
                print(f"No traffic data found for user {user_id} in the last {time_range}. Returning empty time series.")
                return empty_result

            # 시간 범위 계산
            unit = time_range[-1]
            value = int(time_range[:-1])
            if unit == 'h': seconds = value * 3600
            elif unit == 'd': seconds = value * 86400
            else: seconds = value * 60

            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(seconds=seconds)

            # 데이터가 있을 경우에만 집계 쿼리를 실행합니다.
            query = {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {"match": {"user_id": user_id}},
                            {"range": {"@timestamp": {"gte": start_time.isoformat(), "lte": end_time.isoformat()}}}
                        ]
                    }
                },
                "aggs": {
                    "traffic_over_time": {
                        "date_histogram": {
                            "field": "@timestamp",
                            "fixed_interval": "1s" if seconds <= 3600 else "1m",
                            "min_doc_count": 0,
                            "extended_bounds": {"min": start_time.isoformat(), "max": end_time.isoformat()}
                        },
                        "aggs": {
                            "fwd_packets": {"sum": {"field": "source.packets"}},
                            "bwd_packets": {"sum": {"field": "destination.packets"}},
                            "fwd_bytes": {"sum": {"field": "source.bytes"}},
                            "bwd_bytes": {"sum": {"field": "destination.bytes"}}
                        }
                    }
                }
            }
            response = await es.search(index=settings.es_index_packetbeat, body=query)
            buckets = response.get('aggregations', {}).get('traffic_over_time', {}).get('buckets', [])

            return {
                "timestamps": [b['key_as_string'] for b in buckets],
                "packets_per_second": [(b.get('fwd_packets', {}).get('value', 0) or 0) + (b.get('bwd_packets', {}).get('value', 0) or 0) for b in buckets],
                "bytes_per_second": [(b.get('fwd_bytes', {}).get('value', 0) or 0) + (b.get('bwd_bytes', {}).get('value', 0) or 0) for b in buckets]
            }
        except NotFoundError:
             print(f"Index {settings.es_index_packetbeat} not found. Returning empty time series.")
             return empty_result
        except Exception as e:
            print(f"❌ ES 시계열 트래픽 조회 실패 (User: {user_id}): {e}", flush=True)
            return empty_result

    async def get_top_ports(self, es: AsyncElasticsearch, user_id: str, time_range: str = "1h", top_n: int = 10) -> List[Dict[str, Any]]:
        """
        특정 사용자의 지정된 시간 동안 상위 목적지 포트를 반환합니다.
        """
        try:
            query = {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {"match": {"user_id": user_id}},
                            {"range": {"@timestamp": {"gte": f"now-{time_range}"}}}
                        ]
                    }
                },
                "aggs": {"top_ports": {"terms": {"field": "destination.port", "size": top_n}}}
            }
            response = await es.search(index=settings.es_index_packetbeat, body=query)
            buckets = response.get('aggregations', {}).get('top_ports', {}).get('buckets', [])
            return [{"port": b['key'], "count": b['doc_count']} for b in buckets]
        except NotFoundError:
             print(f"Index {settings.es_index_packetbeat} not found. Returning empty list for top ports.")
             return []
        except Exception as e:
            print(f"❌ ES 상위 포트 집계 실패 (User: {user_id}): {e}", flush=True)
            return []

    async def get_traffic_summary_by_ip(self, es: AsyncElasticsearch, user_id: str, time_range: str = "1h", top_n: int = 10) -> List[Dict[str, Any]]:
        """
        특정 사용자의 IP별 트래픽을 요약하여 상위 N개를 반환합니다.
        """
        try:
            query = {
                "size": 0,
                "query": {
                    "bool": {
                        "filter": [
                            {"match": {"user_id": user_id}},
                            {"range": {"@timestamp": {"gte": f"now-{time_range}"}}}
                        ]
                    }
                },
                "aggs": {
                    "ip_summary": {
                        "terms": {"field": "source.ip.keyword", "size": top_n},
                        "aggs": {
                            "total_fwd_packets": {"sum": {"field": "source.packets"}},
                            "total_bwd_packets": {"sum": {"field": "destination.packets"}},
                            "total_fwd_bytes": {"sum": {"field": "source.bytes"}},
                            "total_bwd_bytes": {"sum": {"field": "destination.bytes"}}
                        }
                    }
                }
            }
            response = await es.search(index=settings.es_index_packetbeat, body=query)
            buckets = response.get('aggregations', {}).get('ip_summary', {}).get('buckets', [])
            
            results = []
            for bucket in buckets:
                total_packets = (bucket.get('total_fwd_packets', {}).get('value', 0) or 0) + \
                                (bucket.get('total_bwd_packets', {}).get('value', 0) or 0)
                total_bytes = (bucket.get('total_fwd_bytes', {}).get('value', 0) or 0) + \
                              (bucket.get('total_bwd_bytes', {}).get('value', 0) or 0)
                results.append({
                    "ip": bucket['key'],
                    "flow_count": bucket['doc_count'],
                    "total_packets": int(total_packets),
                    "total_bytes": int(total_bytes)
                })
            return results
        except NotFoundError:
             print(f"Index {settings.es_index_packetbeat} not found. Returning empty list for top IPs.")
             return []
        except Exception as e:
            print(f"❌ ES IP별 트래픽 요약 조회 실패 (User: {user_id}): {e}", flush=True)
            return []

# 서비스 인스턴스 생성
traffic_user_service = TrafficDashboardService()
