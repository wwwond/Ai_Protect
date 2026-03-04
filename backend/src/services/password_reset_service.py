# 비동기 세션 및 라이브러리 임포트
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from ..models.models import User
from ..models.models import PasswordResetToken
# 비동기 이메일 전송 유틸리티로 변경
from ..utils.email_sender import send_email
from ..utils.auth import get_password_hash
from ..core.config import settings # 설정 임포트

RESET_TOKEN_EXPIRE_MINUTES = 15
PASSWORD_RESET_BASE_URL = settings.password_reset_base_url # 설정 파일에서 URL 로드

# 1. [비동기] 비밀번호 재설정 토큰 생성 및 이메일 전송
async def create_password_reset_token(db: AsyncSession, user: User) -> Optional[PasswordResetToken]:
    # 기존 토큰 조회 및 삭제
    existing_token_result = await db.execute(
        select(PasswordResetToken).filter(PasswordResetToken.user_id == user.emp_number)
    )
    existing_token = existing_token_result.scalars().first()
    if existing_token:
        await db.delete(existing_token)
        await db.commit()

    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

    db_token = PasswordResetToken(
        token=token,
        user_id=user.emp_number,
        expires_at=expires_at
    )
    db.add(db_token)
    await db.commit()
    await db.refresh(db_token)

    # 이메일 전송
    reset_link = f"{PASSWORD_RESET_BASE_URL}?token={token}"
    subject = f"[{settings.project_name}] 비밀번호 재설정 링크 안내" # 설정에서 프로젝트 이름 로드
    body = f"""... (이메일 본문은 동일) ..."""
    
    # 비동기 이메일 전송 호출
    email_sent = await send_email(user.email, subject, body)
    
    if not email_sent:
        await db.delete(db_token)
        await db.commit()
        return None

    return db_token

# 2. [비동기] 토큰 유효성 검증
async def verify_password_reset_token(db: AsyncSession, token: str) -> Optional[User]:
    result = await db.execute(select(PasswordResetToken).filter(PasswordResetToken.token == token))
    db_token = result.scalars().first()

    if not db_token or db_token.expires_at < datetime.now(timezone.utc):
        if db_token: # 만료된 경우에만 삭제
            await db.delete(db_token)
            await db.commit()
        return None

    # 토큰에 연결된 사용자 조회
    user_result = await db.execute(select(User).filter(User.emp_number == db_token.user_id))
    user = user_result.scalars().first()
    
    if not user or user.is_deleted:
        await db.delete(db_token)
        await db.commit()
        return None

    return user

# 3. [비동기] 비밀번호 재설정
async def reset_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.password_hash = get_password_hash(new_password)
    db.add(user)
    
    # 관련 토큰 모두 삭제
    await db.execute(
        PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user.emp_number)
    )
    
    await db.commit()
    await db.refresh(user)
    return user