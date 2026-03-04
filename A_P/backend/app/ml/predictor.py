# app/ml/predictor.py

import joblib
import json
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List

from src.core.config import settings
from app.schemas.schemas import TrafficFeatures, LogFeatures
from app.core.preprocessing import (
    map_sysmon_to_model_columns,
    fill_and_mask_missing_features
)

class Predictor:
    """
    Winlogbeat 로그 및 Packetbeat 트래픽 분석을 위한 일괄 처리 예측을 지원하는 클래스.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(Predictor, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        print("ML Predictor 초기화 시작...", flush=True)
        try:
            # --- Winlogbeat 모델 로드 ---
            self.log_model = joblib.load(settings.log_model_path)
            self.log_scaler = joblib.load(settings.log_scaler_path)
            with open(settings.log_columns_path, "r", encoding="utf-8") as f:
                self.log_base_feature_columns = json.load(f)
            self.log_label_map = {0: "DCOM 공격", 1: "DLL 하이재킹", 2: "WMI 공격", 3: "방어 회피 (MSBuild)", 4: "원격 서비스 공격", 5: "원격 서비스 공격 (WinRM)", 6: "원격 서비스 악용 (Zerologon)", 7: "정상", 8: "지속성 (계정 생성)", 9: "스케줄 작업 공격"}
            print("Winlogbeat 로그 분석 모델 로드 완료.", flush=True)

            # --- Packetbeat 모델 로드 ---
            self.traffic_model = joblib.load(settings.traffic_model_path)
            self.traffic_imputer = joblib.load(settings.traffic_imputer_path)
            self.traffic_scaler = joblib.load(settings.traffic_scaler_path)
            self.traffic_label_encoder = joblib.load(settings.traffic_encoder_path)
            self.traffic_feature_order = list(TrafficFeatures.model_fields.keys())
            print("Packetbeat 트래픽 분석 모델 로드 완료.", flush=True)

        except Exception as e:
            print(f"모델 로딩 중 심각한 오류 발생: {e}", flush=True)
            raise RuntimeError("ML 모델 초기화에 실패했습니다.") from e
            
        self._initialized = True
        print("ML Predictor 초기화 완료.", flush=True)

    def predict_log_threat(self, log_data: Dict[str, Any]) -> Tuple[str, float]:
        """단일 로그 예측 시, batch 메서드를 호출하도록 변경"""
        return self.predict_log_threat_batch([log_data])[0]

    def predict_traffic_threat(self, features_df: pd.DataFrame) -> str:
        """단일 트래픽 예측 시, batch 메서드를 호출하도록 변경"""
        labels = self.predict_traffic_threat_batch(features_df)
        return labels[0] if len(labels) > 0 else "Prediction Error"

    # 아래 두 개의 batch 메서드가 이번 오류의 해결점입니다. ---

    def predict_log_threat_batch(self, processed_logs: List[Dict[str, Any]]) -> List[Tuple[str, float]]:
        """
        모든 전처리가 완료된 로그 피처 리스트를 받아 일괄 예측을 수행합니다.
        """
        try:
            valid_logs = [LogFeatures(**log) for log in processed_logs]
            numeric_dicts = []
            for log_features in valid_logs:
                numeric_dict = {}
                dumped_log = log_features.model_dump()
                for field_name in self.log_base_feature_columns:
                    value = dumped_log.get(field_name)
                    if isinstance(value, str): numeric_dict[field_name] = len(value)
                    elif isinstance(value, (list, dict)): numeric_dict[field_name] = len(value)
                    else: numeric_dict[field_name] = value
                numeric_dicts.append(numeric_dict)
            if not numeric_dicts: return []

            X_batch = pd.DataFrame(numeric_dicts, columns=self.log_base_feature_columns)
            
            x_scaled_batch = self.log_scaler.transform(X_batch)

            preds_proba_batch = self.log_model.predict_proba(x_scaled_batch)
            
            results = []
            for pred_proba in preds_proba_batch:
                pred_index = int(np.argmax(pred_proba))
                pred_score = float(pred_proba[pred_index])
                label_name = self.log_label_map.get(pred_index, "Unknown")
                results.append((label_name, pred_score))
                
            return results
        except Exception as e:
            print(f"Winlogbeat 로그 일괄 예측 중 오류 발생: {e}", flush=True)
            return [("Prediction Error", 0.0)] * len(processed_logs)

    def predict_traffic_threat_batch(self, features_batch_df: pd.DataFrame) -> np.ndarray:
        """
        정제된 트래픽 DataFrame 배치를 받아 위협 여부를 일괄 예측합니다.
        """
        try:
            imputed_data = self.traffic_imputer.transform(features_batch_df)
            imputed_df = pd.DataFrame(imputed_data, columns=features_batch_df.columns)
            scaled_data = self.traffic_scaler.transform(imputed_df)
            prediction_numeric = self.traffic_model.predict(scaled_data)
            prediction_labels = self.traffic_label_encoder.inverse_transform(prediction_numeric)
            return prediction_labels
        except Exception as e:
            print(f"Packetbeat 트래픽 일괄 예측 중 오류 발생: {e}", flush=True)
            return np.array(["Prediction Error"] * len(features_batch_df))

predictor = Predictor()