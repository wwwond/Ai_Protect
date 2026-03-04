# src/utils/auth.py

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# 비동기 DB 세션 및 쿼리 도구 import
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# 프로젝트 내부 모듈 import
from ..schemas.user import TokenData
from ..core.database import get_db
from ..models.models import User  # User 모델 경로 확인
from ..core.config import settings

# --- 1. 비밀번호 해싱 설정 ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """비밀번호를 해시 처리합니다."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해시된 비밀번호를 비교합니다."""
    return pwd_context.verify(plain_password, hashed_password)

# --- 2. JWT (JSON Web Token) 설정 ---
# oauth2_scheme은 로그인 API의 경로를 가리킵니다.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    주어진 데이터를 기반으로 JWT 액세스 토큰을 생성합니다.
    'sub' 클레임에는 이제 emp_number가 사용됩니다.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    # settings.secret_key와 settings.algorithm을 사용합니다.
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

# --- 3. 현재 사용자 인증 및 인가 ---
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    요청 헤더의 JWT 토큰을 검증하고, 유효한 경우 DB에서
    해당 사용자 정보를 찾아 User 모델 객체로 반환합니다. (디버깅 모드)
    """
    print("\n--- [DEBUG] get_current_user 시작 ---")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. 수신된 토큰 확인
        print(f"[DEBUG] 1. 수신된 토큰: {token[:30]}...") # 토큰이 너무 길어서 앞부분만 출력

        # 2. 토큰 디코딩 시도
        print(f"[검증 시 KEY]: '{settings.secret_key}'")
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        print(f"[DEBUG] 2. 토큰 디코딩 성공. Payload: {payload}")
        
        # 3. 'sub' 클레임(사원번호) 추출
        emp_number: str = payload.get("sub")
        print(f"[DEBUG] 3. Payload에서 추출한 사원번호(sub): {emp_number} (타입: {type(emp_number)})")

        if emp_number is None:
            print("[DEBUG] 오류: Payload에 'sub' 클레임이 없습니다.")
            raise credentials_exception
            
        token_data = TokenData(sub=emp_number)

    except JWTError as e:
        print(f"[DEBUG] 오류: JWT 디코딩 실패. 원인: {e}")
        raise credentials_exception

    # 4. DB에서 사용자 조회 시도
    print(f"[DEBUG] 4. DB에서 사원번호 '{token_data.sub}' 사용자를 조회합니다.")
    statement = select(User).where(User.emp_number == token_data.sub)
    result = await db.execute(statement)
    user = result.scalars().first()
    
    # 5. DB 조회 결과 확인
    if user is None:
        print("[DEBUG] 오류: DB에서 해당 사용자를 찾지 못했습니다.")
        raise credentials_exception
    
    print(f"[DEBUG] 5. DB 조회 성공. 사용자: {user.emp_number}, 삭제여부: {user.is_deleted}")

    # 6. 사용자 활성 상태 확인
    if user.is_deleted:
        print("[DEBUG] 오류: 비활성화(삭제)된 계정입니다.")
        raise credentials_exception

    print("--- [DEBUG] get_current_user 인증 성공 ---")
    return user