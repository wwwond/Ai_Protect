# agent/main.py
# 이 파일은 에이전트의 메인 진입점으로, 모든 기능의 실행을 총괄합니다.

import sys
import os
import subprocess
import tempfile
import requests
import time
import json
import threading
from packaging import version

# --- Redis 클라이언트 라이브러리 임포트 ---
import redis

# --- 모듈 임포트 ---
# 각 기능별로 분리된 파이썬 모듈에서 필요한 함수들을 가져옵니다.
try:
    # 실시간 대응 명령을 처리하는 핸들러 함수들을 임포트합니다.
    from remediation import (
        handle_block_ip, handle_unblock_ip,
        handle_block_port, handle_unblock_port,
        handle_quarantine_host, handle_release_isolation
    )
    # 설치/제거 로직을 담고 있는 메인 함수를 임포트합니다.
    from installers.main_installer import main_installer_logic
except ImportError as e:
    # 프로그램 실행에 필수적인 파일이 없을 경우, 오류를 표시하고 종료합니다.
    print(f"CRITICAL ERROR: 필수 모듈을 찾을 수 없습니다: {e}")
    os.system('pause') 
    sys.exit(1)

# ==============================================================================
# 통합 설정
# ==============================================================================
CURRENT_VERSION = "1.0.0"

# Agent의 고유 ID. 프로그램 시작 시 파일에서 동적으로 불러옵니다.
AGENT_ID = None

# 백엔드 서버의 기본 URL입니다.
BACKEND_URL = "http://210.119.12.96:8000"

# 자동 업데이트 및 등록을 위한 API 주소입니다.
UPDATE_API_URL = f"{BACKEND_URL}/api/agent/latest"
REGISTRATION_API_URL = f"{BACKEND_URL}/api/agent/register"

# 에이전트가 설치된 기본 경로와, ID/토큰을 저장할 파일 경로를 정의합니다.
INSTALL_BASE_DIR = os.path.join(os.environ.get('ProgramFiles', 'C:\\Program Files'), 'AttackDetectionAgent')
AGENT_ID_FILE = os.path.join(INSTALL_BASE_DIR, 'agent_id.txt')
TOKEN_FILE = os.path.join(INSTALL_BASE_DIR, 'token.txt')

# --- Redis 설정 ---
# 백엔드에서 명령을 전달하는 데 사용할 Redis 서버 정보입니다.
REDIS_URL = "redis://210.119.12.96:6379/0"
REDIS_ATTACK_CHANNEL = "attack_notifications"

# ==============================================================================
# 에이전트 자동 등록 및 설정
# ==============================================================================

def update_config_files(agent_id: str):
    """주어진 agent_id로 모든 .yml 설정 파일을 수정합니다."""
    print(f"설정 파일을 새로운 Agent ID({agent_id})로 업데이트합니다...")
    for beat_name in ["winlogbeat", "packetbeat"]:
        try:
            yml_path = os.path.join(INSTALL_BASE_DIR, beat_name.capitalize(), f"{beat_name}.yml")
            if os.path.exists(yml_path):
                with open(yml_path, 'r+', encoding='utf-8') as f:
                    content = f.read()
                    # 'NEEDS_REPLACEMENT' 라는 자리표시자 문자열을 실제 ID로 교체합니다.
                    content = content.replace("NEEDS_REPLACEMENT", agent_id)
                    f.seek(0)
                    f.write(content)
                    f.truncate()
                print(f"✅ {yml_path} 업데이트 완료.")
        except Exception as e:
            print(f"❌ {yml_path} 업데이트 실패: {e}")

def restart_beat_services():
    """데이터 수집 서비스들을 재시작하여 새 설정을 적용합니다."""
    print("데이터 수집 서비스를 재시작합니다...")
    subprocess.run(['net', 'stop', 'winlogbeat'], check=False, capture_output=True)
    subprocess.run(['net', 'stop', 'packetbeat'], check=False, capture_output=True)
    time.sleep(2)
    subprocess.run(['net', 'start', 'winlogbeat'], check=False, capture_output=True)
    subprocess.run(['net', 'start', 'packetbeat'], check=False, capture_output=True)
    print("서비스 재시작 완료.")

def register_agent():
    """
    에이전트가 자신의 ID를 가지고 있는지 확인하고, 없을 경우 token.txt를 읽어 설정합니다.
    """
    global AGENT_ID
    
    # 1. 영구 저장된 ID 파일이 있는지 먼저 확인합니다.
    if os.path.exists(AGENT_ID_FILE):
        with open(AGENT_ID_FILE, 'r') as f:
            AGENT_ID = f.read().strip()
        print(f"기존 Agent ID를 로드했습니다: {AGENT_ID}")
        return

    # 2. ID 파일이 없다면, '일회용 열쇠'(token.txt)가 있는지 확인합니다.
    if not os.path.exists(TOKEN_FILE):
        print("Agent ID와 Token 파일이 모두 없습니다. 설정을 진행할 수 없습니다.")
        return

    print("Agent ID가 없습니다. token.txt 파일에서 ID를 읽어옵니다...")
    try:
        # 3. 토큰 파일에서 user_id를 직접 읽어옵니다. (서버 API 호출 없음)
        with open(TOKEN_FILE, 'r') as f:
            new_agent_id = f.read().strip()
        
        if not new_agent_id:
            raise ValueError("token.txt 파일이 비어있습니다.")

        # 4. 읽어온 ID를 영구 파일(agent_id.txt)에 저장하고, 전역 변수에도 할당합니다.
        with open(AGENT_ID_FILE, 'w') as f:
            f.write(new_agent_id)
        AGENT_ID = new_agent_id
        print(f"✅ token.txt에서 새로운 Agent ID를 설정했습니다: {AGENT_ID}")

        # 5. 설정 파일들을 새로운 ID로 업데이트하고, 서비스들을 재시작합니다.
        update_config_files(AGENT_ID)
        restart_beat_services()

    except Exception as e:
        print(f"❌ 에이전트 설정 과정 중 오류 발생: {e}")
    finally:
        # 6. 보안을 위해, 성공 여부와 상관없이 일회용 토큰 파일은 항상 삭제합니다.
        if os.path.exists(TOKEN_FILE):
            os.remove(TOKEN_FILE)
            print("보안을 위해 임시 토큰 파일을 삭제했습니다.")

# ==============================================================================
# 실시간 대응(Remediation) 관련 함수
# ==============================================================================
def handle_cmd(cmd: dict):
    """Redis로부터 받은 명령(action)에 따라 적절한 대응 함수를 호출합니다."""
    action = cmd.get("action")
    print(f"명령 처리 시작: {action}")
    try:
        if action == "block_ip": handle_block_ip(cmd["ip"])
        elif action == "unblock_ip": handle_unblock_ip(cmd["ip"])
        elif action == "block_port": handle_block_port(cmd["port"])
        elif action == "unblock_port": handle_unblock_port(cmd["port"])
        elif action == "isolate_host": handle_quarantine_host(cmd.get("host"))
        elif action == "release_isolation": handle_release_isolation(cmd.get("host"))
        else:
            print(f"⚠️  알 수 없는 명령(action)입니다: {action}")
            return
        
        print(f"✅ '{action}' 명령 실행 완료.")

    except KeyError as e:
        print(f"❌ 명령 실행 실패: 필수 파라미터가 없습니다. ({e})")
    except Exception as e:
        print(f"❌ '{action}' 명령 실행 중 예외 발생: {e}")

def redis_listener():
    """Redis 채널을 구독하고, 수신된 명령을 처리하는 무한 루프입니다."""
    while True:
        try:
            r = redis.from_url(REDIS_URL, decode_responses=True)
            p = r.pubsub(ignore_subscribe_messages=True)
            p.subscribe(REDIS_ATTACK_CHANNEL)
            print(f"Redis 연결 성공. '{REDIS_ATTACK_CHANNEL}' 채널을 구독합니다.")
            print("Redis 채널에서 새로운 명령을 기다립니다...")
            for message in p.listen():
                try:
                    cmd = json.loads(message['data'])
                    print(f"📨 새로운 명령 수신: {cmd}")
                    handle_cmd(cmd)
                except json.JSONDecodeError:
                    print(f"잘못된 JSON 형식의 메시지 수신: {message['data']}")
                except Exception as e:
                    print(f"메시지 처리 중 오류 발생: {e}")
        except redis.exceptions.ConnectionError as e:
            print(f"🚨 Redis 연결 실패: {e}. 10초 후 재시도합니다.")
            time.sleep(10)
        except Exception as e:
            print(f"🚨 Redis 리스너에서 예기치 않은 오류 발생: {e}. 10초 후 재시도합니다.")
            time.sleep(10)

def run_remediation_mode():
    """실시간 대응 모드를 실행합니다."""
    print("🚀 실시간 대응 모듈을 시작합니다...")
    register_agent()

    if not AGENT_ID:
        print("Agent ID가 없어 실시간 대응 모듈을 시작할 수 없습니다. 5분 후 서비스가 재시도합니다.")
        return

    listener_thread = threading.Thread(target=redis_listener, daemon=True)
    listener_thread.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n프로그램을 종료합니다.")
        sys.exit(0)

# ==============================================================================
# 설치 및 업데이트 관련 함수
# ==============================================================================
def check_for_updates() -> bool:
    try:
        print("🔄 최신 버전을 확인하고 있습니다...")
        response = requests.get(UPDATE_API_URL, timeout=5)
        response.raise_for_status()
        latest_info = response.json()
        latest_version_str = latest_info.get("version")
        if version.parse(latest_version_str) > version.parse(CURRENT_VERSION):
            print(f"✅ 새로운 버전({latest_version_str})이 있습니다. 업데이트를 시작합니다.")
            download_url = latest_info.get("download_url")
            download_and_run_updater(download_url)
            return True
        else:
            print("👍 현재 최신 버전을 사용하고 있습니다.")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 업데이트 서버에 연결할 수 없습니다. 오프라인으로 설치를 계속합니다. (오류: {e})")
        return False
    except Exception as e:
        print(f"❌ 업데이트 확인 중 예기치 않은 오류 발생: {e}")
        return False

def download_and_run_updater(url: str):
    try:
        filename = url.split('/')[-1]
        temp_dir = tempfile.gettempdir()
        download_path = os.path.join(temp_dir, filename)
        print(f"📥 '{filename}' 다운로드 중...")
        with requests.get(url, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(download_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"🟢 다운로드 완료: {download_path}")
        print("🚀 새 설치 프로그램을 실행합니다. 현재 프로그램은 종료됩니다.")
        subprocess.Popen([download_path])
        sys.exit(0)
    except Exception as e:
        print(f"❌ 업데이트 파일 처리 중 오류 발생: {e}")
        sys.exit(1)

def run_installer_mode():
    """설치 및 업데이트 모드를 실행합니다."""
    print("🚀 설치/업데이트 모드를 시작합니다...")
    update_in_progress = check_for_updates()
    if not update_in_progress:
        try:
            print("\n'install' 작업을 시작합니다...")
            main_installer_logic("install")
            print("'install' 작업이 완료되었습니다.")
        except Exception as e:
            print(f"An error occurred during the 'install' process: {e}")
            sys.exit(1)

# ==============================================================================
# 메인 실행 진입점
# ==============================================================================
def main():
    """
    스크립트 실행 시 전달된 인자에 따라 다른 모드로 작동합니다.
    """
    action = "install"
    if len(sys.argv) > 1:
        action = sys.argv[1]
    
    if action == 'run':
        run_remediation_mode()
    elif action == 'install':
        run_installer_mode()
    elif action == 'uninstall':
        print("🚀 제거 모드를 시작합니다...")
        try:
            main_installer_logic("uninstall")
        except Exception as e:
            print(f"An error occurred during the 'uninstall' process: {e}")
            sys.exit(1)
    else:
        print(f"알 수 없는 인자입니다: {action}")
        sys.exit(1)

if __name__ == "__main__":
    main()
