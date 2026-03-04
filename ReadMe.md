실시간 Sysmon 로그 및 네트워크 트래픽 분석을 통한 지능형 이상 징후 탐지 및 LLM 자동 대응 시스템

본 프로젝트는 대규모 보안 로그 데이터에서 머신러닝 모델을 통해 공격 행위를 실시간으로 분류하고, LLM(Llama 3)을 활용하여 전문가 수준의 침해사고 분석 보고서를 자동 생성하는 통합 보안 플랫폼입니다.

🛢️ 시스템 아키텍쳐
Data Pipeline: Sysmon & Packetbeat → Kafka (메시지 큐) → FastAPI (전처리 및 추론)
Storage: Elasticsearch (로그 검색 및 저장), Redis (실시간 탐지 캐싱)
AI Engine: XGBoost/LightGBM (공격 분류), Llama 3 (Ollama) (대응 가이드 및 LLM 생성)

📌 중요 기술 특성 
1. Robust Data Engineering
Complex JSON Flattening: 중첩된 비정형 Sysmon 로그를 재귀 파싱 로직을 통해 정형 데이터(Tabular)로 변환하는 파이프라인 구축.
Feature Selection: 339개의 초기 피처 중 상수값, 결측치, 데이터 누수(Leakage) 가능성이 높은 식별자(ID)를 제거하고, 중요도 기반 상위 30개 핵심 피처를 선별하여 모델 경량화 및 추론 속도 개선.

2. Machine Learning Optimization
Imbalanced Data Handling: 정상 로그 대비 극소수인 공격 로그 특성을 고려하여 Class Weight(가중치) 최적화 실험 진행.
Model Comparison: XGBoost, LightGBM, CatBoost 성능 비교를 통해 보안 환경에 최적화된 모델 채택.
Weight Grid Search: 가중치 배수(1.2x ~ 2.5x) 실험을 통해 특정 공격 기법(WMI, MSBuild 등)의 Recall(재현율) 향상.

3. LLM-Based Incident Reporting
Automated Analysis: 탐지된 MITRE ATT&CK 기법 정보를 기반으로 공격 의도 분석 및 방화벽 차단 룰 자동 제안.
Actionable Insights: 보안 관제 인력의 업무 부하를 줄이기 위한 가시성 높은 대응 리포트 생성.