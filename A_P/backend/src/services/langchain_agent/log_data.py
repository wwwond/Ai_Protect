# app/services/log_dashboard_service.py

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

# ▼▼▼ [수정] literal_column을 import하여 SQL 문법 오류를 해결합니다. ▼▼▼
from sqlalchemy import select, func, text, literal_column
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch

from src.core.config import settings
from app.models.models import AttackLog

class LogDashboardService:
    """
    로그 데이터 LLM 통계에 필요한 데이터를 조회하고 가공하는 비즈니스 로직을 담당합니다.
    """

    async def get_log_count(self, es: AsyncElasticsearch, user_id: str, time_range: str = "24h") -> Dict[str, Any]:
        """
        주어진 시간 범위(예: '1h', '7d') 동안 특정 사용자의 로그 수를 조회합니다.
        """
        try:
            query = {
                "query": {
                    "bool": {
                        "filter": [
                            {"match": {"user_id": user_id}},
                            {"range": {"@timestamp": {"gte": f"now-{time_range}"}}}
                        ]
                    }
                }
            }
            response = await es.count(index=settings.es_index_winlogbeat, body=query)
            return {"log_count": response.get("count", 0)}
        except Exception as e:
            print(f"❌ ES 로그 수 집계 실패 (User: {user_id}, Range: {time_range}): {e}", flush=True)
            return {"log_count": 0}

    async def get_threat_summary(self, db: AsyncSession, user_id: str, time_range: str = "7d") -> Dict[str, Any]:
        """
        주어진 시간 범위 내에서 특정 사용자의 총 탐지 위협, 최다 발생 위협 유형 등을 조회합니다.
        """
        results = {
            "total_threats": 0,
            "top_threat_type": "N/A",
            "distribution": []
        }
        try:
            sql_interval = time_range.replace('h', ' hour').replace('d', ' day').replace('m', ' minute')
            
            # ▼▼▼ [수정] func.text() 대신 literal_column()을 사용하여 SQL 문법 오류를 해결합니다. ▼▼▼
            stmt = select(
                AttackLog.attack_type,
                func.count(AttackLog.log_id).label("count")
            ).where(
                AttackLog.user_id == user_id,
                AttackLog.detected_at >= func.now() - literal_column(f"INTERVAL '{sql_interval}'")
            ).group_by(AttackLog.attack_type).order_by(func.count(AttackLog.log_id).desc())
            
            summary_result = await db.execute(stmt)
            distribution_data = [{"type": row.attack_type, "count": row.count} for row in summary_result.mappings().all()]

            if distribution_data:
                results["distribution"] = distribution_data
                results["total_threats"] = sum(item['count'] for item in distribution_data)
                results["top_threat_type"] = distribution_data[0]['type']
                results["threat_type_count"] = len(distribution_data)

            return results
        except Exception as e:
            print(f"❌ DB 위협 통계 요약 실패 (User: {user_id}, Range: {time_range}): {e}", flush=True)
            return results

    async def get_recent_threat_logs(self, db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """
        특정 사용자의 최신 위협 로그 목록을 조회합니다. (시간 범위와 무관)
        """
        try:
            stmt = select(
                AttackLog.detected_at,
                AttackLog.attack_type,
                AttackLog.source_address,
                AttackLog.description,
                AttackLog.hostname
            ).where(AttackLog.user_id == user_id).order_by(AttackLog.detected_at.desc()).offset(skip).limit(limit)
            
            threat_logs_result = await db.execute(stmt)
            
            results_list = []
            for row in threat_logs_result.mappings().all():
                details = dict(row)
                description_data = details.get("description", {})
                details["process_name"] = description_data.get("process_path", "N/A") 
                del details["description"]
                results_list.append(details)

            return results_list
        except Exception as e:
            await db.rollback()
            print(f"❌ DB 최신 위협 로그 조회 실패 (User: {user_id}): {e}", flush=True)
            return []

# 서비스 인스턴스 생성
log_user_service = LogDashboardService()
