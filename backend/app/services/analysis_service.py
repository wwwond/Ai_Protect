# app/services/analysis_service.py
import uuid
import json
import asyncio
import time
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import pandas as pd
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from elasticsearch.helpers import async_bulk

# --- 애플리케이션 내부 모듈 임포트 ---
from app.core.redis_client import redis_client
from app.core.preprocessing import map_sysmon_to_model_columns, fill_and_mask_missing_features
from app.core.database import AsyncSessionLocal, es_client
from src.core.config import settings
from app.ml.predictor import predictor
from app.models.models import AttackLog, AttackTraffic
from app.schemas.schemas import RawTrafficData

# --- 로거(Logger) 설정 ---
# 서비스 전반의 이벤트 기록을 위해 표준 로깅 모듈을 설정합니다.
# 로그 레벨은 INFO로 설정하여 정보성, 경고, 오류 로그를 모두 출력합니다.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- 상수(Constants) 정의 ---
# Winlogbeat 로그에서 IP 주소를 찾기 위한 후보 필드 경로 목록
WINLOG_IP_CANDIDATES = [
    "winlog.event_data.SourceIp",
    "winlog.event_data.IpAddress",
    "source.ip",
    "destination.ip",
    "host.ip"
]
# 유효하지 않은 IP 주소로 간주할 값들의 집합
INVALID_IPS = {"-", "::1", "127.0.0.1"}

# --- 유틸리티 함수(Utility Functions) ---

def _get_nested_value(data: Dict[str, Any], path: str) -> Any:
    """
    점(.)으로 구분된 경로를 따라 중첩된 딕셔너리에서 값을 안전하게 가져옵니다.
    경로의 중간에 키가 없거나 해당 값이 딕셔너리가 아니면 None을 반환합니다.
    
    :param data: 탐색할 딕셔너리
    :param path: 점으로 구분된 키 경로 (e.g., "winlog.event_data.SourceIp")
    :return: 찾은 값 또는 None
    """
    keys = path.split('.')
    val = data
    for k in keys:
        if not isinstance(val, dict):
            return None
        val = val.get(k)
        if val is None:
            return None
    return val

def get_ip_from_log(log_data: Dict[str, Any], candidates: List[str]) -> Optional[str]:
    """
    주어진 로그 데이터와 후보 경로 목록에서 유효한 IP 주소를 찾습니다.
    첫 번째로 발견되는 유효한 IP 주소를 반환합니다.

    :param log_data: IP 주소를 찾을 로그 데이터(딕셔너리)
    :param candidates: IP 주소 후보 필드 경로 리스트
    :return: 찾은 IP 주소 문자열 또는 None
    """
    for path in candidates:
        ip = _get_nested_value(log_data, path)
        if isinstance(ip, str) and ip not in INVALID_IPS:
            return ip
    return None

# --- 서비스 클래스(Service Class) ---

class AnalysisService:
    """
    수집된 로그와 트래픽을 효율적인 일괄 처리(batch) 방식으로 분석하고 대응합니다.
    - Kafka로부터 메시지를 받아 처리합니다.
    - Elasticsearch에 원본 데이터를 저장합니다.
    - 머신러닝 모델을 사용하여 위협을 예측합니다.
    - 탐지된 공격 정보를 데이터베이스에 저장하고 대응 조치를 생성합니다.
    """
    async def process_winlogbeat_logs_batch(self, messages: List[dict]):
        """Kafka에서 받은 Winlogbeat 로그 메시지들을 일괄 처리합니다."""
        if not messages: return

        es_actions, logs_to_process = [], []
        # 1. 메시지 순회: ES 저장 작업 목록 생성 및 예측할 로그 분리
        for data in messages:
            log_data = data.get("log_data", {})
            if not log_data: continue
            
            log_id = str(uuid.uuid4()) # 각 로그에 고유 ID 부여
            # Elasticsearch에 저장할 문서(document) 생성
            es_doc = {
                "@timestamp": log_data.get("@timestamp", datetime.now(timezone.utc).isoformat()),
                "agent_id": data.get("agent_id", "unknown"),
                "hostname": data.get("host", {}).get("name"),
                "log_source": "winlogbeat",
                **log_data
            }
            es_actions.append({"_index": settings.es_index_winlogbeat, "_id": log_id, "_source": es_doc})
            logs_to_process.append({"log_id": log_id, "log_data": log_data})

        # 2. Elasticsearch에 일괄 저장 (Bulk Insert)
        if es_actions:
            try:
                await async_bulk(es_client, es_actions)
                logger.info(f"✅ Winlogbeat 로그 {len(es_actions)}건 ES 저장 성공.")
            except Exception as e:
                logger.error(f"❌ Winlogbeat 로그 ES 배치 저장 실패: {e}")
                return # ES 저장 실패 시 후속 처리 중단

        # 3. 데이터베이스 세션을 사용하여 예측 및 결과 저장
        async with AsyncSessionLocal() as db_session:
            processed_features_for_prediction, log_info_map = [], []
            
            # 3-1. 예측을 위한 데이터 전처리
            for log_info in logs_to_process:
                # Sysmon 로그를 모델이 이해할 수 있는 컬럼으로 매핑
                mapped_features = map_sysmon_to_model_columns(log_info["log_data"])
                # 결측치 채우기 및 마스킹
                processed_features = fill_and_mask_missing_features(mapped_features)
                processed_features_for_prediction.append(processed_features)
                log_info_map.append(log_info) # 예측 결과와 매칭하기 위해 원본 정보 저장

            if not processed_features_for_prediction: return

            # 3-2. 머신러닝 모델 일괄 예측 실행
            logger.info(f"🔮 총 {len(processed_features_for_prediction)}건의 로그에 대해 일괄 예측을 시작합니다.")
            prediction_start_time = time.perf_counter()
            # 동기 함수인 predictor를 비동기 이벤트 루프에서 차단 없이 실행
            predictions = await asyncio.to_thread(predictor.predict_log_threat_batch, processed_features_for_prediction)
            prediction_end_time = time.perf_counter()
            logger.info(f"⏱️ Winlogbeat 일괄 예측 시간: {prediction_end_time - prediction_start_time:.4f} 초")

            attack_logs_to_save = []
            # 3-3. 예측 결과 처리
            for original_info, (label, score) in zip(log_info_map, predictions):
                try:
                    # 공격 조건: 레이블이 '정상'이 아니고, 신뢰도 점수가 임계값(0.8) 이상
                    is_attack = (label != "정상") and (label != "Prediction Error") and (score >= 0.8)
                    if is_attack:
                        log_data, log_id = original_info["log_data"], original_info["log_id"]
                        logger.warning(f"⚠️ 공격 탐지됨 [Winlogbeat]: Type={label}, Score={score:.4f}")
                        
                        # Redis에 위협 통계 업데이트 및 대응 조치 발행
                        await redis_client.hincrby("threat_stats", label, 1)
                        source_ip = get_ip_from_log(log_data, WINLOG_IP_CANDIDATES)
                        dest_port_str = _get_nested_value(log_data, "winlog.event_data.DestinationPort")

                        if source_ip:
                            await redis_client.publish(settings.redis_attack_channel, json.dumps({"action": "block_ip", "ip": source_ip}))
                            logger.info(f"🚀 IP 차단 명령 생성: ip={source_ip}")
                        if dest_port_str:
                            try:
                                dest_port = int(dest_port_str)
                                await redis_client.publish(settings.redis_attack_channel, json.dumps({"action": "block_port", "port": dest_port}))
                                logger.info(f"🚀 포트 차단 명령 생성: port={dest_port}")
                            except (ValueError, TypeError): pass
                        
                        # DB에 저장할 AttackLog 객체 생성
                        attack_log_id = int(hashlib.sha1(log_id.encode()).hexdigest(), 16) % (10**12)
                        details = {
                            "rule_name": _get_nested_value(log_data, "winlog.event_data.RuleName"),
                            "process_guid": _get_nested_value(log_data, "winlog.event_data.ProcessGuid"),
                            "process_path": _get_nested_value(log_data, "winlog.event_data.Image"),
                            "user": log_data.get("user", {}).get("name"),
                            "es_log_id": log_id,
                            "es_log_index": settings.es_index_winlogbeat
                        }
                        new_attack = AttackLog(
                            log_attack_id=attack_log_id,
                            detected_at=datetime.now(timezone.utc),
                            attack_type=label, severity="High",
                            confidence=round(score * 100, 2),
                            source_address=source_ip,
                            hostname=log_data.get("host", {}).get("name"),
                            user_id=log_data.get('user_id'),
                            description=details,
                            response_type="Auto-detected",
                            responded_at=datetime.now(timezone.utc),
                            notification=False
                        )
                        attack_logs_to_save.append(new_attack)
                    else:
                        logger.info(f"✅ 정상 로그 [Winlogbeat]: Type={label}")
                except Exception as e:
                    logger.error(f"❌ Winlog 결과 처리 중 오류 발생: {e}")
            
            # 3-4. 탐지된 공격 로그들을 DB에 일괄 저장
            if attack_logs_to_save:
                db_save_start_time = time.perf_counter()
                try:
                    db_session.add_all(attack_logs_to_save)
                    await db_session.commit()
                    logger.info(f"✅ 공격 로그 {len(attack_logs_to_save)}건 DB 저장 성공")
                except Exception as e:
                    await db_session.rollback() # 오류 발생 시 롤백
                    logger.error(f"❌ 공격 로그 DB 일괄 저장 실패: {e}")
                db_save_end_time = time.perf_counter()
                logger.info(f"⏱️ Winlogbeat DB 저장 시간: {db_save_end_time - db_save_start_time:.4f} 초")

    # --- Packetbeat 처리 관련 헬퍼(Helper) 메서드 ---

    def _sanitize_raw_packetbeat_data(self, raw_doc: dict) -> dict:
        """Packetbeat 원본 데이터에 필수 키가 누락되지 않도록 기본값을 설정합니다."""
        raw_doc.setdefault("destination", {}).setdefault("port", 0)
        raw_doc["destination"].setdefault("packets", 0)
        raw_doc["destination"].setdefault("bytes", 0)
        raw_doc.setdefault("source", {}).setdefault("packets", 0)
        raw_doc["source"].setdefault("bytes", 0)
        raw_doc.setdefault("network", {}).setdefault("protocol", "tcp")
        raw_doc["network"].setdefault("duration", 0)
        return raw_doc

    def _extract_traffic_fields(self, raw_doc: dict) -> dict:
        """Packetbeat 원본 데이터에서 모델 예측에 필요한 필드들을 추출하고 이름을 매핑합니다."""
        mapping = {"Dst_Port": "destination.port", "Protocol": "network.protocol", "Flow_Duration": "network.duration", "Tot_Fwd_Pkts": "source.packets", "Tot_Bwd_Pkts": "destination.packets", "TotLen_Fwd_Pkts": "source.bytes", "TotLen_Bwd_Pkts": "destination.bytes"}
        protocol_map = {'tcp': 6, 'udp': 17, 'icmp': 1} # 프로토콜 이름을 숫자로 변환
        extracted = {}
        for target, path in mapping.items():
            val = _get_nested_value(raw_doc, path)
            if target == "Protocol" and isinstance(val, str):
                extracted[target] = protocol_map.get(val.lower(), 0)
            else:
                extracted[target] = val or 0
        return extracted

    def _calculate_traffic_features(self, raw_data: RawTrafficData) -> pd.DataFrame:
        """추출된 트래픽 데이터로부터 파생 피처(Feature)들을 계산하여 DataFrame을 생성합니다."""
        epsilon = 1e-9 # 0으로 나누기 방지를 위한 작은 값
        duration_sec = (raw_data.Flow_Duration / 1_000_000) + epsilon # duration은 보통 마이크로초 단위
        total_bytes = raw_data.TotLen_Fwd_Pkts + raw_data.TotLen_Bwd_Pkts
        total_pkts = raw_data.Tot_Fwd_Pkts + raw_data.Tot_Bwd_Pkts + epsilon
        features = {
            "Dst_Port": raw_data.Dst_Port, "Protocol": raw_data.Protocol, "Flow_Duration": raw_data.Flow_Duration,
            "Tot_Fwd_Pkts": raw_data.Tot_Fwd_Pkts, "Tot_Bwd_Pkts": raw_data.Tot_Bwd_Pkts,
            "TotLen_Fwd_Pkts": raw_data.TotLen_Fwd_Pkts, "TotLen_Bwd_Pkts": raw_data.TotLen_Bwd_Pkts,
            "Flow_Byts_per_s": total_bytes / duration_sec, "Flow_Pkts_per_s": total_pkts / duration_sec,
            "Fwd_Pkts_per_s": raw_data.Tot_Fwd_Pkts / duration_sec, "Bwd_Pkts_per_s": raw_data.Tot_Bwd_Pkts / duration_sec,
            "Down_per_Up_Ratio": raw_data.Tot_Bwd_Pkts / (raw_data.Tot_Fwd_Pkts + epsilon),
            "Pkt_Size_Avg": total_bytes / total_pkts,
            "Fwd_Seg_Size_Avg": raw_data.TotLen_Fwd_Pkts / (raw_data.Tot_Fwd_Pkts + epsilon),
            "Bwd_Seg_Size_Avg": raw_data.TotLen_Bwd_Pkts / (raw_data.Tot_Bwd_Pkts + epsilon)
        }
        # 모델이 학습된 피처 순서와 동일하게 DataFrame 컬럼 순서를 고정
        order = ["Dst_Port", "Protocol", "Flow_Duration", "Tot_Fwd_Pkts", "Tot_Bwd_Pkts", "TotLen_Fwd_Pkts", "TotLen_Bwd_Pkts", "Flow_Byts_per_s", "Flow_Pkts_per_s", "Fwd_Pkts_per_s", "Bwd_Pkts_per_s", "Down_per_Up_Ratio", "Pkt_Size_Avg", "Fwd_Seg_Size_Avg", "Bwd_Seg_Size_Avg"]
        return pd.DataFrame([features])[order]

    async def process_packetbeat_traffic_batch(self, messages: List[dict]):
        """Kafka에서 받은 Packetbeat 트래픽 메시지들을 일괄 처리합니다."""
        # 이 메서드의 구조는 `process_winlogbeat_logs_batch`와 매우 유사합니다.
        if not messages: return

        es_actions, traffic_to_process = [], []
        # 1. ES 저장 목록 생성 및 처리할 트래픽 분리
        for data in messages:
            raw_doc = data.get("traffic_data", {})
            if not raw_doc: continue
            log_id = str(uuid.uuid4())
            es_doc = {"@timestamp": raw_doc.get("@timestamp", datetime.now(timezone.utc).isoformat()), "agent_id": data.get("agent_id", "unknown"), "hostname": data.get("host", {}).get("name"), "log_source": "packetbeat", **raw_doc}
            es_actions.append({"_index": settings.es_index_packetbeat, "_id": log_id, "_source": es_doc})
            traffic_to_process.append({"log_id": log_id, "raw_traffic_doc": raw_doc})

        # 2. Elasticsearch에 일괄 저장
        if es_actions:
            try:
                await async_bulk(es_client, es_actions)
                logger.info(f"✅ Packetbeat 로그 {len(es_actions)}건 ES 저장 성공.")
            except Exception as e:
                logger.error(f"❌ Packetbeat 로그 ES 배치 저장 실패: {e}")
                return

        # 3. 데이터베이스 세션을 사용하여 예측 및 결과 저장
        async with AsyncSessionLocal() as db_session:
            features_df_list, traffic_info_map = [], []
            # 3-1. 예측을 위한 데이터 전처리
            for traffic_info in traffic_to_process:
                try:
                    cleaned_doc = self._sanitize_raw_packetbeat_data(traffic_info["raw_traffic_doc"])
                    extracted_fields = self._extract_traffic_fields(cleaned_doc)
                    raw_data = RawTrafficData.model_validate(extracted_fields) # Pydantic 모델로 데이터 유효성 검사
                    final_features_df = self._calculate_traffic_features(raw_data)
                    features_df_list.append(final_features_df)
                    traffic_info_map.append({'log_id': traffic_info['log_id'], 'cleaned_doc': cleaned_doc, 'features_dict': final_features_df.to_dict('records')[0]})
                except (ValidationError, Exception) as e:
                    logger.error(f"❌ Packetbeat 데이터 전처리 중 오류: {e}")

            if not features_df_list: return

            # 3-2. 머신러닝 모델 일괄 예측 실행
            batch_df = pd.concat(features_df_list, ignore_index=True) # 개별 DataFrame들을 하나로 합쳐 배치 처리
            
            logger.info(f"🔮 총 {len(batch_df)}건의 트래픽에 대해 일괄 예측을 시작합니다.")
            prediction_start_time = time.perf_counter()
            predictions = await asyncio.to_thread(predictor.predict_traffic_threat_batch, batch_df)
            prediction_end_time = time.perf_counter()
            logger.info(f"⏱️ Packetbeat 일괄 예측 시간: {prediction_end_time - prediction_start_time:.4f} 초")
            
            attack_traffics_to_save = []
            # 3-3. 예측 결과 처리
            for item_info, label in zip(traffic_info_map, predictions):
                try:
                    is_attack = (label != "Benign") and (label != "Prediction Error")
                    if is_attack:
                        logger.warning(f"⚠️ 공격 탐지됨 [Packetbeat]: Type={label}")
                        
                        # Redis 통계 업데이트 및 대응 조치 발행
                        await redis_client.hincrby("threat_stats", label, 1)
                        cleaned_doc = item_info['cleaned_doc']
                        source_ip = cleaned_doc.get("source", {}).get("ip")
                        dest_port = cleaned_doc.get("destination", {}).get("port")

                        if source_ip:
                            await redis_client.publish(settings.redis_attack_channel, json.dumps({"action": "block_ip", "ip": source_ip}))
                            logger.info(f"🚀 IP 차단 명령 생성: ip={source_ip}")
                        if dest_port is not None:
                            await redis_client.publish(settings.redis_attack_channel, json.dumps({"action": "block_port", "port": dest_port}))
                            logger.info(f"🚀 포트 차단 명령 생성: port={dest_port}")
                        
                        # DB에 저장할 AttackTraffic 객체 생성
                        traffic_attack_id = int(hashlib.sha1(item_info["log_id"].encode()).hexdigest(), 16) % (10**12)
                        features_dict = item_info['features_dict']
                        new_attack = AttackTraffic(
                            traffic_attack_id=traffic_attack_id,
                            timestamp=datetime.now(timezone.utc),
                            user_id=item_info['cleaned_doc'].get("user_id"),
                            src_ip=source_ip,
                            dst_port=features_dict.get("Dst_Port"),
                            protocol=features_dict.get("Protocol"),
                            flow_duration=features_dict.get("Flow_Duration"),
                            tot_fwd_pkts=features_dict.get("Tot_Fwd_Pkts"),
                            tot_bwd_pkts=features_dict.get("Tot_Bwd_Pkts"),
                            flow_byts_per_s=features_dict.get("Flow_Byts_per_s"),
                            flow_pkts_per_s=features_dict.get("Flow_Pkts_per_s"),
                            down_per_up_ratio=features_dict.get("Down_per_Up_Ratio"),
                            # 현재 계산되지 않는 피처들은 DB 스키마에 맞춰 기본값(0)으로 설정, DB 컬럼 수정 필요.
                            bwd_iat_tot=0,
                            fin_flag_cnt=0,
                            rst_flag_cnt=0,
                            psh_flag_cnt=0,
                            ack_flag_cnt=0,
                            urg_flag_cnt=0,
                            notification=False
                        )
                        attack_traffics_to_save.append(new_attack)
                    else:
                        logger.info(f"✅ 정상 트래픽 [Packetbeat]: Type={label}")
                except Exception as e:
                    logger.error(f"❌ Packetbeat 결과 처리 중 오류 발생: {e}")
            
            # 3-4. 탐지된 공격 트래픽들을 DB에 일괄 저장
            if attack_traffics_to_save:
                db_save_start_time = time.perf_counter()
                try:
                    db_session.add_all(attack_traffics_to_save)
                    await db_session.commit()
                    logger.info(f"✅ 공격 트래픽 {len(attack_traffics_to_save)}건 DB 저장 성공")
                except Exception as e:
                    await db_session.rollback()
                    logger.error(f"❌ 공격 트래픽 DB 일괄 저장 실패: {e}")
                db_save_end_time = time.perf_counter()
                logger.info(f"⏱️ Packetbeat DB 저장 시간: {db_save_end_time - db_save_start_time:.4f} 초")

    async def get_threat_statistics(self) -> dict:
        """Redis에서 위협 통계 데이터를 가져옵니다."""
        try:
            # Redis 해시(hash)에서 모든 필드와 값을 가져옴
            stats = await redis_client.hgetall("threat_stats")
            # Redis에서 받은 데이터는 byte-string이므로, key는 utf-8로 디코딩하고 value는 정수로 변환
            return {key.decode('utf-8'): int(value) for key, value in stats.items()}
        except Exception as e:
            logger.error(f"❌ Redis에서 통계 조회 중 오류 발생: {e}")
            return {}

# AnalysisService 클래스의 인스턴스를 생성하여 다른 모듈에서 사용
analysis_service = AnalysisService()