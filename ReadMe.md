# AI_Protect
### 실시간 Sysmon 로그 분석 기반 지능형 위협 탐지 플랫폼 웹

Sysmon/Packetbeat로 수집한 보안 로그를 Kafka로 실시간 처리하고,
XGBoost 모델로 10개 MITRE ATT&CK 공격 기법을 분류하는 통합 보안 플랫폼입니다.

팀 프로젝트 (5인) | 2025.06 ~ 2025.07

## 1. 시스템 아키텍쳐
[Agent] Sysmon/Packetbeat
    ↓ 로그/트래픽
[Kafka Broker] 토픽 분리 (TCP:9092)
    ↓ Consumer
[FastAPI Backend] 전처리 → 모델 추론 → 위협 판단
    ↓                        ↓
[Elasticsearch]          [PostgreSQL]
로그 저장/검색            공격 이력 저장
    ↓
[React Frontend] 실시간 로그 모니터링 대시보드


## 2. 중요 기술 특성 
### 2-1. 데이터 파이프라인
- 중첩 JSON 구조의 Sysmon 로그를 재귀 파싱으로 평탄화(Flatten)
- 163,408건 로그 데이터, 339개 피처 → 중요도 기반 상위 30개 선별
- Kafka Consumer 배치 처리 (max_poll_records=500, 성능 튜닝 적용)

### 2-2. ML 모델
- 대상: 10개 MITRE ATT&CK 공격 기법 + 정상 분류 (11-class)
- 비교 실험: XGBoost / LightGBM / CatBoost
- 최종 선택: XGBoost (상위 30 피처 기준 Macro F1-score 0.99)
- 클래스 불균형 처리: Class Weight 최적화 실험 (1.2x ~ 2.5x)

| 모델 | 전체 피처 | 상위 30 피처 |
|------|-----------|-------------|
| XGBoost | 0.9593 | **0.9633** |
| LightGBM | 0.9528 | 0.9752 |
| CatBoost | 0.9313 | 0.9376 |

### 3. 실시간 서빙 구조 
- FastAPI + asyncio.to_thread로 동기 모델을 비동기 서빙
- 공격 탐지 시 Redis Pub/Sub으로 IP/포트 차단 명령 즉시 발행
- 신뢰도 임계값(0.8) 이상일 때만 공격으로 판정

## 4. 탐지 대상 공격 기법

| MITRE ID | 공격 기법 | 학습 데이터 수 |
|----------|-----------|---------------|
| T1574.001 | DLL 하이재킹 | 53,108 |
| T1021.003 | DCOM 공격 | 47,530 |
| T1021.002 | 원격 서비스 공격 | 16,532 |
| T1136.001 | 지속성 (계정 생성) | 12,278 |
| T1047 | WMI 공격 | 8,726 |
| T1021.006 | 윈도우 원격 관리 | 8,589 |
| T1053.005 | 스케줄 작업 공격 | 7,417 |
| T1127.001 | 방어 회피 (MSBuild) | 4,559 |
| Benign | 정상 | 3,879 |
| T1210 | Zerologon | 790 |

## 5. 기술 스택

| 분류 | 기술 |
|------|------|
| Backend | FastAPI, Python, asyncio |
| ML | XGBoost, LightGBM, CatBoost, Scikit-learn |
| Data Pipeline | Kafka, Winlogbeat, Packetbeat, Sysmon |
| Storage | Elasticsearch, PostgreSQL, Redis |
| LLM | Llama 3, Ollama, LangChain |
| Frontend | React, TypeScript, Tailwind CSS |
| Infra | Docker Compose, NGINX |

## 6. 실행 방법

```bash
# 1. 저장소 클론
git clone https://github.com/wwwond/Ai_Protect.git

# 2. Docker Compose 실행
docker-compose up -d

# 3. 접속
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
