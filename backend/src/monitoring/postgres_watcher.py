# src/monitoring/postgres_watcher.py

import os
import sys
import requests
import time
import asyncio
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from sqlalchemy import select, update

# --- 프로젝트 경로 설정 및 모듈 import ---
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

from src.core.database import AsyncSessionLocal
from src.models.models import AttackLog, AttackTraffic, AlertHistory
from src.core.config import settings

# --- 1. 설정 ---
ALERT_API_URL = settings.internal_api_base_url_second + "/api/internal/alert"
POLLING_INTERVAL = settings.monitoring_polling_interval
ALERT_COOLDOWN_MINUTES = 10

# --- 2. 핵심 기능 함수 ---

async def fetch_unprocessed_attacks(db, model):
    """지정된 테이블에서 처리되지 않은 모든 공격을 비동기로 가져옵니다."""
    try:
        stmt = select(model).where(model.notification == False)
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        print(f"❌ DB 조회 중 오류 발생 ({model.__tablename__}): {e}")
        return []

async def mark_attacks_as_sent(db, model, attack_ids, id_column_name: str):
    """지정된 ID 목록에 해당하는 레코드들을 처리 완료로 비동기 업데이트합니다."""
    if not attack_ids: return
    try:
        id_column = getattr(model, id_column_name)
        stmt = update(model).where(id_column.in_(attack_ids)).values(notification=True)
        await db.execute(stmt)
        print(f"   - 📝 {len(attack_ids)}개의 {model.__tablename__} 공격 처리 완료로 표시 (커밋 대기)")
    except Exception as e:
        print(f"   - ❌ DB 업데이트 중 오류 발생: {e}")
        raise

async def call_alert_api_async(payload: dict):
    """FastAPI 서버의 알림 API를 비동기적으로 호출합니다."""
    try:
        response = await asyncio.to_thread(
            requests.post, ALERT_API_URL, json=payload, timeout=10
        )
        response.raise_for_status()
        print(f"   - ✅ API 호출 성공: user_id={payload.get('user_id')}, type={payload.get('attack_type')}")
        return True
    except requests.RequestException as e:
        error_detail = e.response.json() if e.response else str(e)
        print(f"   - ❌ API 호출 실패: {e}, 상세: {error_detail}")
        return False

async def process_attacks(db, model, attack_id_field, source_name):
    """공격 목록을 그룹화하고, 쿨다운을 확인하여 알림을 보냅니다. (commit 없음)"""
    attacks = await fetch_unprocessed_attacks(db, model)
    if not attacks: return

    print(f"🚨 [{datetime.now(timezone.utc).isoformat()}] {len(attacks)}개의 새로운 '{model.__tablename__}' 공격 탐지!")
    
    grouped_attacks = defaultdict(list)
    # ▼▼▼ [수정] user_id가 없는 공격을 따로 처리하기 위한 리스트 ▼▼▼
    unidentified_attacks = []

    for attack in attacks:
        user_id = getattr(attack, 'user_id', None)
        attack_type = getattr(attack, 'attack_type', 'Traffic Anomaly')
        if user_id:
            grouped_attacks[(user_id, attack_type)].append(attack)
        else:
            # user_id가 없는 공격은 별도로 모음
            unidentified_attacks.append(attack)

    all_processed_ids = []
    alert_tasks = []

    # 1. user_id가 있는 공격 처리
    for (user_id, attack_type), attack_list in grouped_attacks.items():
        stmt = select(AlertHistory).where(
            AlertHistory.user_id == user_id, 
            AlertHistory.attack_type == attack_type
        )
        result = await db.execute(stmt)
        history = result.scalars().first()
        
        now = datetime.now(timezone.utc)
        cooldown_time = now - timedelta(minutes=ALERT_COOLDOWN_MINUTES)
        
        attack_ids_in_group = [getattr(a, attack_id_field) for a in attack_list]
        all_processed_ids.extend(attack_ids_in_group)

        if not history or history.last_sent_at < cooldown_time:
            print(f"   - 📢 알림 발송 준비: User={user_id}, Type={attack_type}, Count={len(attack_list)}")
            
            payload = {
                "user_id": user_id,
                "attack_type": attack_type,
                "count": len(attack_list),
                "source": source_name,
                "attack_ids": attack_ids_in_group
            }
            alert_tasks.append(call_alert_api_async(payload))
            
            if history:
                history.last_sent_at = now
            else:
                db.add(AlertHistory(user_id=user_id, attack_type=attack_type, last_sent_at=now))
        else:
            print(f"   - 🚫 쿨다운, 알림 건너뛰기: User={user_id}, Type={attack_type}")

    # 2. user_id가 없는 공격 ID들을 처리 목록에 추가
    if unidentified_attacks:
        unidentified_ids = [getattr(a, attack_id_field) for a in unidentified_attacks]
        all_processed_ids.extend(unidentified_ids)
        print(f"   - ℹ️ {len(unidentified_ids)}개의 user_id 없는 공격을 처리 대상으로 표시합니다.")


    # 모든 API 호출을 병렬로 실행
    if alert_tasks:
        await asyncio.gather(*alert_tasks)

    # 처리된 ID가 있으면 DB 업데이트를 스테이징
    if all_processed_ids:
        await mark_attacks_as_sent(db, model, all_processed_ids, attack_id_field)

# --- 3. 메인 실행 루프 ---
async def main():
    """메인 감시 루프를 실행합니다."""
    print("🚀 PostgreSQL 기반 지능형 알림 시스템 (비동기)을 시작합니다...")
    while True:
        db_session = AsyncSessionLocal()
        try:
            await process_attacks(db_session, AttackLog, "log_id", "log")
            await process_attacks(db_session, AttackTraffic, "traffic_id", "traffic")
            
            await db_session.commit()
            print("✅ 모든 작업이 성공적으로 커밋되었습니다.")

        except Exception as e:
            print(f"감시 루프 중 에러 발생: {e}")
            await db_session.rollback()
        finally:
            await db_session.close()
        
        print(f"--- 다음 확인까지 {POLLING_INTERVAL}초 대기 ---")
        await asyncio.sleep(POLLING_INTERVAL)

# --- 스크립트 실행 ---
if __name__ == "__main__":
    asyncio.run(main())
