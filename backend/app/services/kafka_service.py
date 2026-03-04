# app/services/kafka_service.py
import logging
import json
import asyncio
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError
from typing import Callable, Coroutine, Dict, List
from src.core.config import settings

logger = logging.getLogger(__name__)

class KafkaService:
    _producer: AIOKafkaProducer = None

    @classmethod
    async def get_producer(cls) -> AIOKafkaProducer:
        if cls._producer is None:
            max_retries = 5
            retry_delay = 3
            for i in range(max_retries):
                try:
                    logger.info(f"Kafka 연결 시도 중... (서버: {settings.kafka_bootstrap_servers}, 시도: {i+1}/{max_retries})")
                    cls._producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
                    await cls._producer.start()
                    logger.info("Kafka Producer가 성공적으로 시작되었습니다.")
                    return cls._producer
                except KafkaConnectionError as e:
                    logger.error(f"Kafka 연결 실패: {e}")
                    if i < max_retries - 1:
                        logger.info(f"{retry_delay}초 후 재시도합니다...")
                        await asyncio.sleep(retry_delay)
                    else:
                        logger.critical("최대 재시도 횟수를 초과했습니다. Kafka에 연결할 수 없습니다.")
                        raise
        return cls._producer

    @classmethod
    async def send_message(cls, topic: str, message: Dict):
        try:
            producer = await cls.get_producer()
            value_bytes = json.dumps(message).encode('utf-8')
            await producer.send_and_wait(topic, value_bytes)
        except Exception as e:
            logger.error(f"Kafka 메시지 전송 실패 (Topic: {topic}): {e}")

    @classmethod
    async def close_producer(cls):
        if cls._producer:
            await cls._producer.stop()
            cls._producer = None
            logger.info("Kafka Producer가 성공적으로 종료되었습니다.")
            
    @staticmethod
    async def run_consumer(
        topic: str,
        group_id: str,
        process_function: Callable[[List[Dict]], Coroutine]
    ):
        """
        지정된 토픽에 대한 Kafka Consumer를 실행합니다. (배치 처리 방식)
        """
        consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=settings.kafka_bootstrap_servers,
            group_id=group_id,
            auto_offset_reset="latest",
            enable_auto_commit=True,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            
            # --- 성능 튜닝 파라미터 ---
            
            # 1. 최소 데이터 크기 설정 (브로커 부하 감소)
            # 브로커는 요청을 받으면 최소 이 크기만큼 데이터가 쌓일 때까지 기다립니다.
            # 1KB 단위로 시작하여 시스템에 맞게 조절합니다.
            fetch_min_bytes=2048, 
            
            # 2. 데이터 대기 시간 유지 (실시간 성)
            # fetch_min_bytes에 도달하지 못해도 최대 이 시간만큼만 기다립니다.
            # 기존 100ms는 실시간 처리에 적합한 값이므로 유지합니다.
            fetch_max_wait_ms=100,
            
            # 3. 한 번에 가져오는 최대 레코드 수 증가 (처리량 증대)
            # 초당 수백 건이므로, 한 번의 요청으로 더 많은 데이터를 가져옵니다.
            max_poll_records=500,
            
            # 4. 파티션 당 최대 데이터 크기 증가 (대용량 처리)
            # 한 번의 요청으로 각 파티션에서 가져올 데이터의 최대 크기를 늘립니다.
            # 기본값 1MB에서 5MB로 늘려 대량 메시지에 대비합니다.
            max_partition_fetch_bytes=5 * 1024 * 1024, 
            
            # 5. 세션 타임아웃 및 요청 타임아웃 조정
            # 컨슈머가 비정상으로 판단되기까지의 시간. max_poll_interval_ms보다 커야 합니다.
            session_timeout_ms=30000,
            # 컨슈머의 배치 처리 시간이 길어질 수 있으므로, 재조정(리밸런싱)까지의 대기 시간을 늘립니다.
            max_poll_interval_ms=300000, 
            # 클라이언트 요청 타임아웃
            request_timeout_ms=40000
        )

        max_retries = 5
        retry_delay = 3
        for i in range(max_retries):
            try:
                logger.info(f"Kafka Consumer 시작 중... (Topic: {topic}, Group: {group_id}, 시도: {i+1}/{max_retries})")
                await consumer.start()
                logger.info(f"Kafka Consumer가 성공적으로 시작되었습니다. (Topic: {topic}, Group: {group_id})")
                break
            except KafkaConnectionError as e:
                logger.error(f"Kafka Consumer 시작 실패: {e}")
                if i < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    logger.critical(f"최대 재시도 횟수 초과. Consumer를 시작할 수 없습니다. (Topic: {topic})")
                    return

        try:
            while True:
                result = await consumer.getmany(timeout_ms=10)
                if not result:
                    continue
                
                for tp, messages in result.items():
                    if not messages:
                        continue
                    
                    print(f"✅ {topic} 토픽에서 {len(messages)}건의 메시지를 배치로 처리합니다.")
                    
                    batch_payloads = []
                    for msg in messages:
                        try:
                            raw = msg.value
                            if topic == settings.kafka_topic_winlogbeat:
                                batch_payloads.append({"log_data": raw})
                            elif topic == settings.kafka_topic_packetbeat:
                                batch_payloads.append({"traffic_data": raw})
                            else:
                                batch_payloads.append(raw)
                        except (json.JSONDecodeError, Exception) as e:
                            logger.error(f"메시지 준비 중 오류: {e}")
                    if batch_payloads:
                        await process_function(batch_payloads)

        except Exception as e:
            logger.error(f"Kafka Consumer 루프에서 심각한 오류 발생 (Topic: {topic}): {e}")
        finally:
            logger.info("Kafka Consumer 종료 절차 시작...")
            await consumer.stop()
            logger.info(f"Kafka Consumer가 성공적으로 종료되었습니다. (Topic: {topic})")