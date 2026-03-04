# app/core/redis_client.py
import redis.asyncio as redis
from src.core.config import settings # 가정: 설정 파일이 이 경로에 있음

# Redis 연결 풀 생성
# decode_responses=True로 설정하면 Redis에서 받은 응답(byte)을 자동으로 utf-8로 디코딩해줍니다.
redis_pool = redis.ConnectionPool.from_url(settings.redis_url, decode_responses=True)

def get_redis_client() -> redis.Redis:
    """
    연결 풀을 사용하여 Redis 클라이언트 인스턴스를 반환하는 의존성 주입 함수입니다.
    """
    return redis.Redis(connection_pool=redis_pool)

# 앱 전역에서 사용할 수 있는 클라이언트 인스턴스
# 서비스 로직에서 직접 import하여 사용할 수 있습니다.
redis_client = get_redis_client()