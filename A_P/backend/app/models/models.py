# app/models/models.py
import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    BigInteger,
    Numeric,
    Text,
    func
)
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.orm import relationship, declarative_base

# Declarative base 클래스
Base = declarative_base()

# --- 테이블 모델 ---

class User(Base):
    """
    'Users' 테이블을 나타냅니다.
    """
    __tablename__ = 'Users'

    user_id = Column(String(50), primary_key=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    emp_number = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    # 관계 설정
    attack_logs = relationship("AttackLog", back_populates="user")
    attack_traffics = relationship("AttackTraffic", back_populates="user")
    incident_log_reports = relationship("IncidentLogReport", back_populates="user")
    incident_traffic_reports = relationship("IncidentTrafficReport", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    activity_logs = relationship("UserActivityLog", back_populates="user")

class AttackLog(Base):
    """
    공격 이벤트 로그를 저장하기 위한 'Attack_log' 테이블을 나타냅니다.
    """
    __tablename__ = 'Attack_log'

    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    log_attack_id = Column(BigInteger, index=True)
    detected_at = Column(DateTime(timezone=True), nullable=False, index=True)
    attack_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False)
    confidence = Column(Numeric(5, 2), nullable=False, comment="0% ~ 100%")
    source_address = Column(String(100), index=True)
    hostname = Column(String(100))
    user_id = Column(String(50), ForeignKey('Users.user_id'))
    description = Column(JSONB, nullable=False, comment="가변적인 상세 로그 필드를 저장 (예: port, rule_name, process_guid 등)")
    response_type = Column(String(50), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=False)
    notification = Column(Boolean, default=False, nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="attack_logs")

class AttackTraffic(Base):
    """
    공격과 관련된 트래픽 데이터를 저장하기 위한 'Attack_traffic' 테이블을 나타냅니다.
    """
    __tablename__ = 'Attack_traffic'

    traffic_id = Column(Integer, primary_key=True, autoincrement=True)
    traffic_attack_id = Column(BigInteger, index=True)
    timestamp = Column("@timestamp", DateTime(timezone=True), nullable=False, index=True)
    user_id = Column(Text, ForeignKey('Users.user_id'), nullable=False)
    src_ip = Column("Src_IP", Text, nullable=False, index=True)
    dst_port = Column("Dst_Port", Integer, nullable=False)
    protocol = Column("Protocol", Integer, nullable=False)
    flow_duration = Column("Flow_Duration", Integer, nullable=False)
    tot_fwd_pkts = Column("Tot_Fwd_Pkts", Integer, nullable=False)
    tot_bwd_pkts = Column("Tot_Bwd_Pkts", Integer, nullable=False)
    flow_byts_per_s = Column("Flow_Byts_per_s", Numeric, nullable=False)
    flow_pkts_per_s = Column("Flow_Pkts_per_s", Numeric, nullable=False)
    bwd_iat_tot = Column("Bwd_IAT_Tot", Integer, nullable=False)
    fin_flag_cnt = Column("FIN_Flag_Cnt", Integer, nullable=False)
    rst_flag_cnt = Column("RST_Flag_Cnt", Integer, nullable=False)
    psh_flag_cnt = Column("PSH_Flag_Cnt", Integer, nullable=False)
    ack_flag_cnt = Column("ACK_Flag_Cnt", Integer, nullable=False)
    urg_flag_cnt = Column("URG_Flag_Cnt", Integer, nullable=False)
    down_per_up_ratio = Column("Down_per_Up_Ratio", Integer, nullable=False)
    notification = Column(Boolean, default=False, nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="attack_traffics")

class IncidentLogReport(Base):
    """
    'Incident_log_reports' 테이블을 나타냅니다.
    """
    __tablename__ = 'Incident_log_reports'

    log_report_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('Users.user_id'), nullable=False)
    log_attack_id = Column(BigInteger, nullable=False)
    summary = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_email = Column(Boolean, default=False, nullable=False)
    sent_popup = Column(Boolean, default=False, nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="incident_log_reports")

class IncidentTrafficReport(Base):
    """
    'Incident_traffic_reports' 테이블을 나타냅니다.
    """
    __tablename__ = 'Incident_traffic_reports'

    traffic_report_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('Users.user_id'), nullable=False)
    traffic_attack_id = Column(BigInteger, nullable=False)
    summary = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    sent_email = Column(Boolean, default=False, nullable=False)
    sent_popup = Column(Boolean, default=False, nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="incident_traffic_reports")

class PasswordResetToken(Base):
    """
    'Password_Reset_Token' 테이블을 나타냅니다.
    """
    __tablename__ = 'Password_Reset_Token'

    token = Column(String(255), primary_key=True)
    user_id = Column(String(50), ForeignKey('Users.user_id'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="password_reset_tokens")

class BlockIP(Base):
    """
    차단된 IP/호스트 정보를 저장하기 위한 'Block_ip' 테이블을 나타냅니다.
    """
    __tablename__ = 'Block_ip'

    block_id = Column(Integer, primary_key=True, autoincrement=True)
    traffic_attack_id = Column(BigInteger)
    log_attack_id = Column(BigInteger)
    ip_address = Column(INET)
    port = Column(Integer)
    host_address = Column(INET)
    blocked_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Boolean, nullable=False)

class PolicyAction(Base):
    """
    자동화된 정책 조치를 기록하기 위한 'Policy_actions' 테이블을 나타냅니다.
    """
    __tablename__ = 'Policy_actions'

    action_id = Column(Integer, primary_key=True, autoincrement=True)
    traffic_attack_id = Column(BigInteger)
    log_attack_id = Column(BigInteger)
    action_type = Column(String(50), nullable=False)
    target = Column(String(100), nullable=False)
    triggered_at = Column(DateTime(timezone=True), nullable=False)
    executed_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Boolean, nullable=False)

class Session(Base):
    """
    사용자 세션을 관리하기 위한 'Sessions' 테이블을 나타냅니다.
    """
    __tablename__ = 'Sessions'

    session_id = Column(String(255), primary_key=True)
    user_id = Column(String(50), ForeignKey('Users.user_id'), nullable=False)
    user_agent = Column(Text, nullable=False)
    ip_address = Column(INET, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="sessions")

class UserActivityLog(Base):
    """
    최근 사용자 활동을 위한 'User_Activity_Log' 테이블을 나타냅니다.
    """
    __tablename__ = 'User_Activity_Log'

    activity_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('Users.user_id'), nullable=False)
    activity_type = Column(String(50), nullable=False, comment="로그인, 비밀번호 변경, 프로필 수정 등 활동 유형")
    details = Column(JSONB, comment="활동과 관련된 추가적인 정보를 JSON 형태로 저장")
    ip_address = Column(INET, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # 관계 설정
    user = relationship("User", back_populates="activity_logs")