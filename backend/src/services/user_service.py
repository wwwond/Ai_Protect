from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
import uuid
from datetime import datetime

from ..models.models import User
from ..schemas.user import UserCreate, UserUpdate
from ..utils.auth import get_password_hash

# 사용자 생성 서비스 (비동기)
async def create_user(db: AsyncSession, user_create: UserCreate) -> User:
    """사용자 정보를 받아 데이터베이스에 새로운 사용자를 생성합니다."""
    print(f"DEBUG: create_user 함수 시작 - 이메일: {user_create.email}, 사번: {user_create.emp_number}")
    
    hashed_password = get_password_hash(user_create.password)
    print("DEBUG: 비밀번호 해싱 완료.")
    
    db_user = User(
        user_id=str(uuid.uuid4()),
        password_hash=hashed_password,
        email=user_create.email,
        name=user_create.name,
        phone=user_create.phone,
        emp_number=user_create.emp_number,
    )
    print(f"DEBUG: DB User 객체 생성 (커밋 전): user_id={db_user.user_id}, emp_number={db_user.emp_number}")

    try:
        db.add(db_user)
        print("DEBUG: DB 세션에 사용자 추가 완료 (아직 DB 저장 전).")
        
        await db.commit()
        print("DEBUG: DB 커밋 완료. 데이터베이스에 저장됨.")
        
        await db.refresh(db_user)
        print(f"DEBUG: DB User 객체 새로고침 완료. user_id={db_user.user_id}, created_at={db_user.created_at}")
        
        return db_user
    except Exception as e:
        await db.rollback()
        print(f"ERROR: create_user 함수에서 DB 저장 중 심각한 오류 발생: {e}")
        raise

# 이메일로 사용자 조회 (비동기)
async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """이메일 주소로 사용자를 조회합니다."""
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

# 사원번호로 사용자 조회 (비동기)
async def get_user_by_emp_number(db: AsyncSession, emp_number: str) -> Optional[User]:
    """사원번호로 사용자를 조회합니다."""
    result = await db.execute(select(User).filter(User.emp_number == emp_number))
    return result.scalars().first()

# 사용자 정보 업데이트 서비스 (비동기)
async def update_user(db: AsyncSession, db_user: User, user_update: UserUpdate) -> User:
    """사용자 정보를 업데이트합니다."""
    update_data = user_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if key == "password":
            setattr(db_user, "password_hash", get_password_hash(value))
        else:
            setattr(db_user, key, value)
            
    # updated_at 필드가 모델에 있다면 추가
    # db_user.updated_at = datetime.utcnow() 
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

# 사용자 탈퇴 (소프트 삭제) 서비스 (비동기)
async def deactivate_user(db: AsyncSession, db_user: User):
    """사용자를 비활성화(소프트 삭제) 처리합니다."""
    db_user.is_deleted = True
    # updated_at 필드가 모델에 있다면 추가
    # db_user.updated_at = datetime.utcnow()
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

# 사용자 비밀번호 업데이트 서비스 (비동기)
async def update_user_password(db: AsyncSession, user_id: str, new_password: str) -> Optional[User]:
    """주어진 user_id에 해당하는 사용자의 비밀번호를 업데이트합니다."""
    result = await db.execute(select(User).filter(User.user_id == user_id))
    user = result.scalars().first()
    
    if user:
        user.password_hash = get_password_hash(new_password)
        # updated_at 필드가 모델에 있다면 추가
        # user.updated_at = datetime.utcnow()
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    return None
