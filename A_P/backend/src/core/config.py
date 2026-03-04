# src/core/config.py
import os
from pydantic import Field, EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    .env 파일의 환경 변수를 읽어와 관리하는 설정 클래스입니다.
    모든 필드에 alias를 명시하여 .env 변수와 1:1로 매핑합니다.
    """
    # Elasticsearch
    elasticsearch_hosts: str = Field(alias="ELASTICSEARCH_HOSTS")
    elasticsearch_host: str = Field(alias="ELASTICSEARCH_HOST")
    elasticsearch_port: int = Field(alias="ELASTICSEARCH_PORT")
    es_index_winlogbeat: str = Field(alias="ES_INDEX_WINLOGBEAT")
    es_index_packetbeat: str = Field(alias="ES_INDEX_PACKETBEAT")
    elasticsearch_request_timeout: int = Field(alias="ELASTICSEARCH_REQUEST_TIMEOUT", default=15)

    # Kafka
    kafka_bootstrap_servers: str = Field(alias="KAFKA_BOOTSTRAP_SERVERS")
    kafka_consumer_group: str = Field(alias="KAFKA_CONSUMER_GROUP")
    kafka_topic_winlogbeat: str = Field(alias="KAFKA_TOPIC_WINLOGBEAT")
    kafka_topic_packetbeat: str = Field(alias="KAFKA_TOPIC_PACKETBEAT")
    kafka_topic_agent_response: str = Field(alias="KAFKA_TOPIC_AGENT_RESPONSE")
    
    # Redis
    redis_url: str = Field(alias="REDIS_URL")
    redis_attack_channel: str = Field(alias="REDIS_ATTACK_CHANNEL")

    # ML Model Paths
    log_columns_path: str = Field(alias="LOG_COLUMNS_PATH")
    log_model_path: str = Field(alias="LOG_MODEL_PATH")
    log_scaler_path: str = Field(alias="LOG_SCALER_PATH")
    traffic_model_path: str = Field(alias="TRAFFIC_MODEL_PATH")
    traffic_imputer_path: str = Field(alias="TRAFFIC_IMPUTER_PATH")
    traffic_scaler_path: str = Field(alias="TRAFFIC_SCALER_PATH")
    traffic_encoder_path: str = Field(alias="TRAFFIC_ENCODER_PATH")
    
    # DB & JWT
    database_url: str = Field(alias="DATABASE_URL")
    secret_key: str = Field(alias="SECRET_KEY")
    algorithm: str = Field(alias="ALGORITHM")
    access_token_expire_minutes: int = 120

    # AI Services
    google_api_key: str = Field(alias="GOOGLE_API_KEY")
    tavily_api_key: str = Field(alias="TAVILY_API_KEY")

    # Email Service
    mail_username: str = Field(alias="MAIL_USERNAME")
    mail_password: str = Field(alias="MAIL_PASSWORD")
    mail_from: EmailStr = Field(alias="MAIL_FROM")
    mail_port: int = Field(alias="MAIL_PORT")
    mail_server: str = Field(alias="MAIL_SERVER")

    # SMS Service
    coolsms_api_key: str = Field(alias="COOLSMS_API_KEY")
    coolsms_api_secret: str = Field(alias="COOLSMS_API_SECRET")
    coolsms_sender_phone: str = Field(alias="COOLSMS_SENDER_PHONE")

    # Notification Recipient
    admin_email: EmailStr = Field(alias="ADMIN_EMAIL")
    admin_phone: str = Field(alias="ADMIN_PHONE")
    
    # Internal API & Monitoring
    internal_api_base_url: str = Field(alias="INTERNAL_API_BASE_URL", default="http://210.119.12.96:8000")
    internal_api_base_url_second: str = Field(alias="INTERNAL_API_BASE_URL_SECOND", default="http://210.119.12.96:8001")
    monitoring_polling_interval: int = Field(alias="MONITORING_POLLING_INTERVAL", default=15)
    
    password_reset_base_url: str
    
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='forbid'  # .env에 정의되지 않은 필드가 있으면 오류 발생
    )

# 설정 객체 인스턴스 생성
settings = Settings()

# 필요한 경우 os.environ에 직접 설정 (LangChain 등 일부 라이브러리는 os.environ을 직접 읽음)
os.environ["GOOGLE_API_KEY"] = settings.google_api_key
os.environ["TAVILY_API_KEY"] = settings.tavily_api_key