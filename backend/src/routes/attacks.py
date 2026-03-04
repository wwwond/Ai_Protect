# src/routes/attacks.py

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field # Field를 import 합니다.
from typing import List # List 타입을 import 합니다.
from datetime import datetime, timezone

from ..services import email_service, sms_service
from ..core.database import get_db
from ..models.models import User, IncidentLogReport, IncidentTrafficReport

router = APIRouter(prefix="/api/internal", tags=["Internal Notifier"])

# ▼▼▼ [핵심 수정] watcher가 보내는 데이터 형식과 일치하도록 Pydantic 모델을 변경합니다. ▼▼▼
class AlertPayload(BaseModel):
    user_id: str
    attack_type: str
    count: int
    source: str  # "log" 또는 "traffic"
    attack_ids: List[int] = Field(..., min_items=1) # 최소 1개의 ID를 포함하는 리스트

@router.post("/alert", status_code=status.HTTP_202_ACCEPTED)
async def trigger_user_alert(
    payload: AlertPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    내부 모니터링 시스템으로부터 그룹화된 공격 알림 요청을 받아,
    DB에 대표 인시던트 보고서를 생성하고 알림을 발송합니다.
    """
    # 1. 사용자 정보 조회
    stmt = select(User).where(User.user_id == payload.user_id)
    result = await db.execute(stmt)
    db_user = result.scalars().first()

    if not db_user:
        print(f"알림 대상 사용자를 찾지 못함: {payload.user_id}")
        return {"message": "User not found, but request accepted."}

    # 2. 인시던트 보고서 생성 (대표 ID 하나만 사용)
    # ▼▼▼ [핵심 수정] 새로운 payload 형식에 맞춰 보고서를 생성합니다. ▼▼▼
    new_report = None
    representative_attack_id = payload.attack_ids[0] # 리스트의 첫 번째 ID를 대표로 사용
    summary_message = f"{payload.count}건의 '{payload.attack_type}' 유형의 공격이 탐지되었습니다."

    if payload.source == "log":
        new_report = IncidentLogReport(
            user_id=db_user.user_id,
            log_attack_id=representative_attack_id,
            summary=summary_message,
            recommendations="시스템 및 애플리케이션 로그를 확인하여 상세 내용을 분석하세요."
        )
    elif payload.source == "traffic":
        new_report = IncidentTrafficReport(
            user_id=db_user.user_id,
            traffic_attack_id=representative_attack_id,
            summary=summary_message,
            recommendations="네트워크 플로우 및 방화벽 로그를 분석하여 상세 내용을 확인하세요."
        )

    if new_report:
        db.add(new_report)
        await db.commit()
    
    # 3. 이메일 및 SMS 발송 (백그라운드 처리)
    subject = f"[보안 경고] {payload.attack_type} 유형 공격 대량 탐지"
    body = f"안녕하세요, {db_user.name}님. 계정에서 {summary_message} 상세 내용은 대시보드를 확인해 주세요."
    sms_message = f"[{payload.attack_type}] {payload.count}건의 보안 경고 탐지. 대시보드 확인."

    background_tasks.add_task(email_service.send_alert_email, db_user.email, subject, body)
    if db_user.phone:
        background_tasks.add_task(sms_service.send_alert_sms, db_user.phone, sms_message)

    return {"message": "Alert tasks have been successfully scheduled."}
