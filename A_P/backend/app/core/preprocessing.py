# app/core/preprocessing.py

import numpy as np
import json
from src.core.config import settings
from app.schemas.schemas import LogFeatures

# 설정 파일에서 columns.json 경로를 가져옴
with open(settings.log_columns_path, "r", encoding="utf-8") as f:
    MODEL_COLUMNS = json.load(f)

# 원본 로그 필드와 모델 피처 이름을 매핑
COLUMN_MAPPING = {
    "Level": "log.level", "System_Version": "winlog.version", 
    "port": "winlog.event_data.DestinationPort", "RuleName": "winlog.event_data.RuleName", 
    "ProcessGuid": "winlog.event_data.ProcessGuid", "Hostname": "host.name", 
    "EventType": "winlog.event_data.EventType", "RecordNumber": "winlog.record_id", 
    "Opcode": "winlog.opcode", "ProcessId": "winlog.process.pid", 
    "Channel": "winlog.channel", "SourceImage": "winlog.event_data.SourceImage", 
    "Keywords": "winlog.keywords", "ExecutionProcessID": "winlog.process.pid", 
    "ActivityID": "winlog.activity_id", "SubjectLogonId": "winlog.event_data.SubjectLogonId",
    "SourceName": "winlog.provider_name", "SubjectUserName": "winlog.event_data.SubjectUserName", 
    "SubjectUserSid": "winlog.event_data.SubjectUserSid", "EventID": "winlog.event_id",
    "UserID": "winlog.user.identifier", "SourceProcessGUID": "winlog.event_data.SourceProcessGuid",
    "ContextInfo": "ContextInfo", "SourceAddress": "winlog.event_data.SourceIp", 
    "ProcessName": "winlog.event_data.TargetProcessName", "ThreadID": "winlog.process.thread.id", 
    "TargetProcessGUID": "winlog.event_data.TargetLogonGuid", "Application": "Application", 
    "SourceProcessId": "winlog.event_data.SourceProcessId", "TargetUserSid": "winlog.event_data.TargetUserSid", 
}

def extract_value(log, dotted_key):
    """중첩된 딕셔너리에서 키 경로를 따라 값을 안전하게 추출합니다."""
    if not dotted_key:
        return None
    keys = dotted_key.split('.')
    val = log
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
            if val is None:
                return None
        else:
            return None
    return val

def map_sysmon_to_model_columns(log_dict):
    """원본 로그를 모델이 사용하는 피처 이름으로 매핑합니다."""
    mapped = {}
    for col in MODEL_COLUMNS:
        sysmon_key = COLUMN_MAPPING.get(col)
        mapped[col] = extract_value(log_dict, sysmon_key) if sysmon_key else None
    return mapped

def fill_and_mask_missing_features(mapped_log):
    """
    [최종 수정 2] 새로 발견된 Keywords, ActivityID, EventID 타입을 처리하도록 개선합니다.
    """
    processed = {}
    
    # Pydantic 오류에 맞춰 실제 모델이 요구하는 타입으로 수정
    FIELD_TYPES = {
        # 기존 타입 정의
        "System_Version": "int", "port": "str", "ProcessId": "str",
        "RecordNumber": "int", "ExecutionProcessID": "int", "ThreadID": "int",
        "SourceProcessId": "int",
        "EventID": "str", 
        "Keywords": "list",
        "ActivityID": "dict" 
    }
    DEFAULT_TYPE = "str"
    DEFAULT_VALUES = {"str": "", "int": 0, "list": [], "dict": {}}

    for col in [f for f in LogFeatures.model_fields if not f.endswith('_missing')]:
        val = mapped_log.get(col)
        missing_flag = 1 if val is None or val == '' else 0
        expected_type = FIELD_TYPES.get(col, DEFAULT_TYPE)

        # 1. 값이 없을 경우, 기대 타입에 맞는 기본값 사용
        if missing_flag == 1:
            val = DEFAULT_VALUES.get(expected_type, "")
        
        # 2. 값이 있는데 타입이 다른 경우, 강제 변환
        else:
            if expected_type == "int":
                try:
                    val = int(val)
                except (ValueError, TypeError):
                    val = 0
            elif expected_type == "str":
                val = str(val)
            elif expected_type == "list":
                if isinstance(val, str):
                    try:
                        # "['Audit Success']" 같은 문자열을 실제 리스트로 변환
                        # eval 대신 더 안전한 json.loads 사용
                        val = json.loads(val.replace("'", '"'))
                    except (json.JSONDecodeError, TypeError):
                        val = [val] # 변환 실패 시, 문자열 자체를 요소로 갖는 리스트로 만듦
                elif not isinstance(val, list):
                     val = [] # 문자열이 아니면서 리스트도 아니면 빈 리스트로 초기화
            elif expected_type == "dict" and not isinstance(val, dict):
                val = {}
        
        processed[col] = val
        processed[f"{col}_missing"] = missing_flag
        
    return processed