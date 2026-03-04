from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

# --- 설정 파일 임포트 ---
from .config import settings

# 🚨 중요: 비동기 드라이버(asyncpg)를 포함한 URL로 변경해야 합니다.
# 예: "postgresql+asyncpg://user:password@host/db"
SQLALCHEMY_DATABASE_URL = settings.database_url

# --- 비동기 SQLAlchemy 엔진 생성 ---
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    # 필요에 따라 다른 옵션 추가 가능
    # echo=True # SQL 쿼리 로깅이 필요할 경우
)

# --- 비동기 세션 메이커 생성 ---
# autocommit, autoflush는 비동기 환경에서 기본적으로 False입니다.
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# --- Declarative Base ---
Base = declarative_base()

# --- 비동기 세션을 위한 의존성 주입 함수 ---
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI 의존성 주입을 위한 비동기 데이터베이스 세션 생성기입니다.
    요청이 시작될 때 세션을 생성하고, 요청이 끝나면 자동으로 닫습니다.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
