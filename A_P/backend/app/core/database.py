# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from typing import AsyncGenerator
from sqlalchemy.orm import sessionmaker, declarative_base
from elasticsearch import AsyncElasticsearch
import logging # 로깅 모듈 임포트

from src.core.config import settings

# 로거 설정 (선택 사항이지만 디버깅에 유용)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- PostgreSQL (SQLAlchemy) Setup ---
try:
    # 비동기 데이터베이스 엔진 생성
    async_engine = create_async_engine(
        settings.database_url,
        echo=False,  # SQL 쿼리 로그 비활성화 (프로덕션)
    )
    
    # 비동기 세션 생성기
    AsyncSessionLocal = sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    # SQLAlchemy 모델의 베이스 클래스
    Base = declarative_base()
    print("PostgreSQL 비동기 엔진 및 세션 초기화 성공.")

except Exception as e:
    logger.error(f"PostgreSQL 초기화 실패: {e}", exc_info=True) # 오류와 트레이스백 함께 로깅
    async_engine = None
    AsyncSessionLocal = None
    Base = declarative_base()

es_client: AsyncElasticsearch = None # 초기화 전 None으로 명시적 선언
# --- Elasticsearch Setup ---
try:
    es_client = AsyncElasticsearch(hosts=settings.elasticsearch_hosts.split(','),
    timeout=0.5,            # 요청 최대 대기 시간(초)
    max_retries=2,         # 재시도 횟수
    retry_on_timeout=True  # 타임아웃 시 재시도 활성화
    )
    print("Elasticsearch 비동기 클라이언트 초기화 성공.")
except Exception as e:
    logger.error(f"Elasticsearch 클라이언트 초기화 실패: {e}", exc_info=True) # 오류와 트레이스백 함께 로깅
    es_client = None

# --- Dependency for FastAPI ---
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI 의존성 주입을 위한 DB 세션 생성기
    API 요청마다 세션을 생성하고, 요청이 끝나면 세션을 닫습니다.
    """
    if not AsyncSessionLocal:
        raise RuntimeError("데이터베이스 세션을 초기화할 수 없습니다.")
        
    async with AsyncSessionLocal() as session:
        yield session

async def get_es_client() -> AsyncElasticsearch:
    """
    FastAPI 의존성 주입을 위한 Elasticsearch 클라이언트 생성기
    """
    if not es_client:
        raise RuntimeError("Elasticsearch 클라이언트를 초기화할 수 없습니다.")
    return es_client