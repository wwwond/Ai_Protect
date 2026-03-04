# app/consumers/traffic_consumer.py

from src.core.config import settings
from app.services.kafka_service import KafkaService
from app.services.analysis_service import analysis_service

async def run_traffic_consumer():
    """
    Packetbeat 트래픽 토픽을 구독하는 Kafka Consumer를 실행합니다.
    """
    await KafkaService.run_consumer(
        topic=settings.kafka_topic_packetbeat,
        group_id=settings.kafka_consumer_group,
        process_function=analysis_service.process_packetbeat_traffic_batch
    )
