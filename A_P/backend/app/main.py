# app/main.py
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- 라우터 임포트 ---
from app.api.endpoints import router as api_router
from app.api import updates, dashboard, agent_downloader, agent_registration

# --- 서비스 및 클라이언트 임포트 ---
from app.consumers.winlogbeat_consumer import run_winlogbeat_consumer
from app.consumers.traffic_consumer import run_traffic_consumer
from app.services.kafka_service import KafkaService
from app.core.database import es_client, Base, async_engine

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="Real-time Threat Detection System",
    description="Winlogbeat/Packetbeat 로그를 분석하여 위협을 탐지하고 자동 대응하는 시스템",
    version="1.0.0"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API 라우터 포함 ---
app.include_router(api_router, prefix="/api")
app.include_router(agent_downloader.router, prefix="/api", tags=["Agent_Management_Download"])
# app.include_router(agent_registration.router, prefix="/api", tags=["Agent_Management_registration"])
app.include_router(updates.router, prefix="/api", tags=["Agent_Management_Update"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])

# 백그라운드 태스크 관리
background_tasks = set()

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행되는 이벤트 핸들러"""
    print("애플리케이션 시작...")
    
    # Elasticsearch 연결 확인
    if not await es_client.ping():
        raise RuntimeError("Elasticsearch에 연결할 수 없습니다.")
    print("Elasticsearch 연결 확인 완료.")

    # DB 테이블 생성
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("데이터베이스 테이블 확인/생성 완료.")

    # Kafka Producer 초기화
    await KafkaService.get_producer()

    # Kafka Consumer들을 백그라운드 태스크로 실행
    log_consumer_task = asyncio.create_task(run_winlogbeat_consumer())
    traffic_consumer_task = asyncio.create_task(run_traffic_consumer())
    
    background_tasks.add(log_consumer_task)
    background_tasks.add(traffic_consumer_task)
    
    log_consumer_task.add_done_callback(background_tasks.discard)
    traffic_consumer_task.add_done_callback(background_tasks.discard)
    print("Kafka Consumer 백그라운드 태스크 시작.")


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행되는 이벤트 핸들러"""
    print("애플리케이션 종료 절차 시작...")
    await KafkaService.close_producer()
    await es_client.close()
    print("모든 리소스가 정상적으로 종료되었습니다.")


@app.get("/", tags=["Root"])
async def read_root():
    """시스템 상태를 확인하는 기본 엔드포인트"""
    return {"status": "ok", "message": "Threat Detection API is running."}
