# app/api/endpoints/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch

from app.services.traffic_dashboard_service import traffic_dashboard_service
from app.services.log_dashboard_service import log_dashboard_service
from app.core.database import get_db_session, get_es_client

router = APIRouter()

@router.get("/dashboard/traffic/stats")
async def get_stats(es: AsyncElasticsearch = Depends(get_es_client)):
    return await traffic_dashboard_service.get_overall_traffic_stats(es)

@router.get("/dashboard/traffic/traffic-over-time")
async def get_traffic_chart(es: AsyncElasticsearch = Depends(get_es_client)):
    return await traffic_dashboard_service.get_traffic_over_time(es)

@router.get("/dashboard/traffic/top-ports")
async def get_top_ports_chart(es: AsyncElasticsearch = Depends(get_es_client), minutes: int = 5):
    # top_n은 서비스의 기본값(30)을 사용하고, minutes는 URL을 통해 전달받음
    return await traffic_dashboard_service.get_top_ports(es, minutes=minutes)

@router.get("/dashboard/traffic/attacks")
async def get_attacks_list(db: AsyncSession = Depends(get_db_session)):
    return await traffic_dashboard_service.get_all_attacks(db)

@router.get("/dashboard/logs/stats")
async def get_log_summary(db: AsyncSession = Depends(get_db_session)):
    """
    총 탐지 위협, 최다 발생 위협, 위협 유형별 분포를 반환합니다.
    """
    return await log_dashboard_service.get_threat_summary(db)


@router.get("/dashboard/logs/count-24h")
async def get_log_count_24h(es: AsyncElasticsearch = Depends(get_es_client)):
    """
    지난 24시간 동안 수집된 로그 수를 반환합니다.
    """
    return await log_dashboard_service.get_log_count_24h(es)


@router.get("/dashboard/logs/list")
async def get_threats_log_list(db: AsyncSession = Depends(get_db_session), skip: int = 0, limit: int = 100):
    """
    최신 위협 로그 목록을 페이지네이션으로 조회합니다.
    """
    return await log_dashboard_service.get_recent_threat_logs(db, skip=skip, limit=limit)