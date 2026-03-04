# app/schemas/schemas.py
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from datetime import datetime

# ===================================================================
# 1. 데이터 소스별 상세 모델 정의
# ===================================================================

class RawTrafficData(BaseModel):
    """
    Packetbeat 에이전트로부터 수신하는 최소한의 원본 필드(7개)를 정의합니다.
    Field의 alias 기능으로 원본 컬럼명(공백 포함)과 파이썬 변수명을 매핑합니다.
    """
    Dst_Port: int = Field(..., alias="Dst_Port")
    Protocol: int = Field(..., alias="Protocol")
    Flow_Duration: int = Field(..., alias="Flow_Duration")
    Tot_Fwd_Pkts: int = Field(..., alias="Tot_Fwd_Pkts")
    Tot_Bwd_Pkts: int = Field(..., alias="Tot_Bwd_Pkts")
    TotLen_Fwd_Pkts: int = Field(..., alias="TotLen_Fwd_Pkts")
    TotLen_Bwd_Pkts: int = Field(..., alias="TotLen_Bwd_Pkts")


# --- [수정] Packetbeat 최종 피처 모델 ---
class TrafficFeatures(BaseModel):
    """
    [수정됨] 네트워크 트래픽 분석 모델에 최종적으로 입력될 15개 피처 스키마
    """
    Dst_Port: int = Field(..., alias="Dst_Port")
    Protocol: int = Field(..., alias="Protocol")
    Flow_Duration: int = Field(..., alias="Flow_Duration")
    Tot_Fwd_Pkts: int = Field(..., alias="Tot_Fwd_Pkts")
    Tot_Bwd_Pkts: int = Field(..., alias="Tot_Bwd_Pkts")
    TotLen_Fwd_Pkts: int = Field(..., alias="TotLen_Fwd_Pkts")
    TotLen_Bwd_Pkts: int = Field(..., alias="TotLen_Bwd_Pkts")
    Flow_Byts_per_s: float = Field(..., alias="Flow_Byts_per_s")
    Flow_Pkts_per_s: float = Field(..., alias="Flow_Pkts_per_s")
    Fwd_Pkts_per_s: float = Field(..., alias="Fwd_Pkts_per_s")
    Bwd_Pkts_per_s: float = Field(..., alias="Bwd_Pkts_per_s")
    Down_per_Up_Ratio: float = Field(..., alias="Down_per_Up_Ratio")
    Pkt_Size_Avg: float = Field(..., alias="Pkt_Size_Avg")
    Fwd_Seg_Size_Avg: float = Field(..., alias="Fwd_Seg_Size_Avg")
    Bwd_Seg_Size_Avg: float = Field(..., alias="Bwd_Seg_Size_Avg")

class LogFeatures(BaseModel):
    """
    Winlogbeat 로그가 전처리된 후의 최종 피처셋(60개)을 정의하고 검증합니다.
    """
    # 원본 피처 (30개) - 사용자 제공 타입 적용
    Level: str
    System_Version: int
    port: str
    RuleName: str
    ProcessGuid: str
    Hostname: str
    EventType: str
    RecordNumber: int
    Opcode: str
    ProcessId: str
    Channel: str
    SourceImage: str
    Keywords: List[str]
    ExecutionProcessID: int
    # dict[str] -> Dict[str, Any]로 수정
    ActivityID: Dict[str, Any]
    SubjectLogonId: str
    SourceName: str
    SubjectUserName: str
    SubjectUserSid: str
    EventID: str
    UserID: str
    SourceProcessGUID: str
    ContextInfo: str
    SourceAddress: str
    ProcessName: str
    ThreadID: int
    FilterRTID: str
    Application: str
    GrantedAccess: str
    SourceThreadId: str

    # _missing 피처 (30개)
    Level_missing: int
    System_Version_missing: int
    port_missing: int
    RuleName_missing: int
    ProcessGuid_missing: int
    Hostname_missing: int
    EventType_missing: int
    RecordNumber_missing: int
    Opcode_missing: int
    ProcessId_missing: int
    Channel_missing: int
    SourceImage_missing: int
    Keywords_missing: int
    ExecutionProcessID_missing: int
    ActivityID_missing: int
    SubjectLogonId_missing: int
    SourceName_missing: int
    SubjectUserName_missing: int
    SubjectUserSid_missing: int
    EventID_missing: int
    UserID_missing: int
    SourceProcessGUID_missing: int
    ContextInfo_missing: int
    SourceAddress_missing: int
    ProcessName_missing: int
    ThreadID_missing: int
    FilterRTID_missing: int
    Application_missing: int
    GrantedAccess_missing: int
    SourceThreadId_missing: int


# ===================================================================
# 2. API 수신(Ingestion)을 위한 통합 모델 정의
# ===================================================================

class LogIngestBase(BaseModel):
    agent_id: str = Field(..., description="로그를 전송한 에이전트의 고유 ID")
    hostname: str = Field(..., description="호스트 이름")

class WinlogbeatIngest(LogIngestBase):
    log_data: Dict[str, Any] = Field(..., description="Winlogbeat 원본 로그 데이터")

class PacketbeatIngest(LogIngestBase):
    traffic_data: RawTrafficData = Field(..., description="Packetbeat 원본 트래픽 데이터")


# ===================================================================
# 3. 기타 스키마
# ===================================================================

# class RemediationAction(BaseModel):
#     agent_id: str
#     action: str
#     target: str
#     reason: Optional[str] = "Automated detection"

class IngestionResponse(BaseModel):
    status: str
    message: str

class ThreatStatResponse(BaseModel):
    statistics: Dict[str, int]

# class IncidentResponse(BaseModel):
#     query: Dict[str, Any]
#     result: Dict[str, Any]

class AttackEventResponse(BaseModel):
    id: int
    detected_at: datetime
    attack_type: str
    confidence: float
    description: Optional[str]
    source_log_id: str
    source_log_index: str
    remediation_status: str

    class Config:
        from_attributes = True
