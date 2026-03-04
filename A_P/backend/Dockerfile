# 공식 Python 런타임 이미지를 기반으로 사용합니다.
FROM python:3.10.11

# 작업 디렉토리를 /app으로 설정합니다.
WORKDIR /app

# --- 의존성 설치 (캐싱 최적화) ---
# 먼저 의존성 파일만 복사합니다. 소스 코드가 변경되어도 이 단계는 캐시를 사용합니다.
# 빌드 컨텍스트(.)를 기준으로 backend 폴더 안의 파일을 지정합니다.
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# --- 애플리케이션 소스 코드 복사 ---
# 전체 프로젝트(.) 대신 실제 실행될 백엔드 애플리케이션 코드만 복사합니다.
# 이렇게 하면 불필요한 파일이 이미지에 포함되지 않고, 진입점(entrypoint) 경로가 명확해집니다.
# 프로젝트 구조를 보니 app/main.py가 메인 진입점이므로 app 폴더를 복사합니다.
COPY ./app /app

# # --- Agent 템플릿 복사 ---
# # 이 부분은 백엔드가 agent 파일을 필요로 할 경우에만 유지합니다.
# COPY agent /agent_template

# 컨테이너가 8000번 포트에서 들어오는 연결을 수신할 것임을 알립니다.
EXPOSE 8000

# 컨테이너 시작 시 실행될 기본 명령어입니다.
# 소스 코드를 /app으로 직접 복사했으므로, 진입점은 'app.main:app'이 됩니다.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]