# app/api/endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch import AsyncElasticsearch
from typing import Dict, Any

from app.schemas import schemas
from app.services.kafka_service import KafkaService
from app.services.analysis_service import analysis_service
# from app.services.incident_service import incident_service
from app.core.database import get_db_session, get_es_client
from src.core.config import settings

router = APIRouter()

# --- Ingestion Endpoints ---

@router.post("/ingest/winlogbeat", response_model=schemas.IngestionResponse, status_code=202)
async def ingest_winlogbeat_log(log_in: schemas.WinlogbeatIngest):
    """
    Agent로부터 Winlogbeat 로그를 받아 Kafka 토픽으로 전송합니다.
    """
    await KafkaService.send_message(settings.kafka_topic_winlogbeat, log_in.model_dump())
    return {"status": "accepted", "message": "Winlogbeat log queued for processing."}

@router.post("/ingest/packetbeat", response_model=schemas.IngestionResponse, status_code=202)
async def ingest_packetbeat_traffic(traffic_in: schemas.PacketbeatIngest):
    """
    Agent로부터 Packetbeat 트래픽 데이터를 받아 Kafka 토픽으로 전송합니다.
    """
    await KafkaService.send_message(settings.kafka_topic_packetbeat, traffic_in.model_dump())
    return {"status": "accepted", "message": "Packetbeat traffic queued for processing."}

# --- Statistics Endpoint ---

@router.get("/statistics/threats", response_model=schemas.ThreatStatResponse)
async def get_realtime_threat_statistics():
    """
    현재까지 탐지된 위협 통계를 반환합니다.
    """
    stats = await analysis_service.get_threat_statistics()
    return {"statistics": stats}

# --- Incident Analysis Endpoints ---

# @router.post("/incidents/path", response_model=schemas.IncidentResponse)
# async def get_incident_path(
#     query: Dict[str, Any] = Body(...),
#     db: AsyncSession = Depends(get_db_session),
#     es: AsyncElasticsearch = Depends(get_es_client)
# ):
#     """인시던트 공격 경로를 추적합니다."""
#     result = await incident_service.trace_attack_path(query, es, db)
#     return {"query": query, "result": result}

# @router.post("/incidents/impact", response_model=schemas.IncidentResponse)
# async def get_incident_impact(
#     query: Dict[str, Any] = Body(...),
#     db: AsyncSession = Depends(get_db_session),
#     es: AsyncElasticsearch = Depends(get_es_client)
# ):
#     """인시던트 영향도를 분석합니다."""
#     result = await incident_service.assess_impact(query, es, db)
#     return {"query": query, "result": result}

# @router.post("/incidents/timeline", response_model=schemas.IncidentResponse)
# async def get_incident_timeline(
#     query: Dict[str, Any] = Body(...),
#     db: AsyncSession = Depends(get_db_session),
#     es: AsyncElasticsearch = Depends(get_es_client)
# ):
#     """인시던트 타임라인을 분석합니다."""
#     result = await incident_service.analyze_timeline(query, es, db)
#     return {"query": query, "result": result}

# # --- Manual Remediation Endpoint ---

# @router.post("/remediate/manual", response_model=schemas.IngestionResponse, status_code=202)
# async def manual_remediation(action: schemas.RemediationAction):
#     """
#     수동으로 대응 조치를 내립니다. (e.g., 특정 IP 차단)
#     """
#     await KafkaService.send_message(
#         topic=settings.kafka_topic_agent_response,
#         message=action.model_dump()
#     )
#     return {"status": "accepted", "message": f"Action '{action.action}' for agent '{action.agent_id}' has been queued."}
