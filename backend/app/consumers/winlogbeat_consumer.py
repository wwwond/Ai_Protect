# app/consumers/winlogbeat_consumer.py

from src.core.config import settings
from app.services.kafka_service import KafkaService
from app.services.analysis_service import analysis_service

async def run_winlogbeat_consumer():
    """
    Winlogbeat 로그 토픽을 구독하는 Kafka Consumer를 실행합니다.
    """
    await KafkaService.run_consumer(
        topic=settings.kafka_topic_winlogbeat,
        group_id=settings.kafka_consumer_group,
        process_function=analysis_service.process_winlogbeat_logs_batch
    )
