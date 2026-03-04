# app/services/log_dashboard_service.py

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch

from src.core.config import settings
from app.models.models import AttackLog

class LogDashboardService:
    """
    로그 데이터 대시보드에 필요한 데이터를 조회하고 가공하는 비즈니스 로직을 담당합니다.
    """

    async def get_log_count_24h(self, es: AsyncElasticsearch) -> Dict[str, Any]:
        """
        지난 24시간 동안 수집된 로그의 총 수를 조회합니다.
        """
        try:
            query = {
                "query": {
                    "range": {
                        "@timestamp": {
                            "gte": "now-24h/h", # 지난 24시간
                            "lte": "now/h"
                        }
                    }
                }
            }
            # winlogbeat 인덱스를 대상으로 카운트
            response = await es.count(index=settings.es_index_winlogbeat, body=query)
            return {"log_count_24h": response.get("count", 0)}
        except Exception as e:
            print(f"❌ ES 24시간 로그 수 집계 실패: {e}", flush=True)
            return {"log_count_24h": 0}

    async def get_threat_summary(self, db: AsyncSession) -> Dict[str, Any]:
        """
        총 탐지 위협, 최다 발생 위협 유형, 위협 유형별 분포를 한 번에 조회합니다.
        """
        results = {
            "total_threats": 0,
            "top_threat_type": "N/A",
            "distribution": []
        }
        try:
            # 위협 유형별로 그룹화하여 개수 집계
            stmt = select(
                AttackLog.attack_type,
                func.count(AttackLog.log_id).label("count")
            ).group_by(AttackLog.attack_type).order_by(func.count(AttackLog.log_id).desc())
            
            summary_result = await db.execute(stmt)
            distribution_data = [{"type": row.attack_type, "count": row.count} for row in summary_result.mappings().all()]

            if distribution_data:
                results["distribution"] = distribution_data # 위협 유형별 분포
                results["total_threats"] = sum(item['count'] for item in distribution_data) # 총 탐지 위협
                results["top_threat_type"] = distribution_data[0]['type'] # 최다 발생 위협 유형
                results["threat_type_count"] = len(distribution_data) # 탐지된 위협 종류 개수

            return results
        except Exception as e:
            print(f"❌ DB 위협 통계 요약 실패: {e}", flush=True)
            return results

    async def get_recent_threat_logs(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """
        지정된 컬럼으로 최신 위협 로그 목록을 조회합니다. (페이지네이션 지원)
        """
        try:
            stmt = select(
                AttackLog.detected_at,      # 수집시각
                AttackLog.attack_type,      # 위협 유형
                AttackLog.source_address,   # 송신지 IP
                AttackLog.description,      # 프로세스명 등을 포함한 JSON
                AttackLog.hostname          # 호스트명
            ).order_by(AttackLog.detected_at.desc()).offset(skip).limit(limit)
            
            threat_logs_result = await db.execute(stmt)
            
            # description(JSON)에서 process_path(프로세스명) 추출
            results_list = []
            for row in threat_logs_result.mappings().all():
                details = dict(row) # Row 객체를 dict로 변환
                description_data = details.get("description", {})
                # 프로세스명은 description JSON 안의 process_path 필드를 사용
                details["process_name"] = description_data.get("process_path", "N/A") 
                del details["description"] # 원본 JSON 필드는 제거하여 간소화
                results_list.append(details)

            return results_list
        except Exception as e:
            await db.rollback()
            print(f"❌ DB 최신 위협 로그 조회 실패: {e}", flush=True)
            return []

# 서비스 인스턴스 생성
log_dashboard_service = LogDashboardService()