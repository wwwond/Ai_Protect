# agent/installers/main_installer.py

import ctypes
import os
import sys
import subprocess
import shutil
import zipfile
import time
import re

# ==============================================================================
# 경로 정의
# ==============================================================================

def get_base_path():
    """
    실행 환경(소스 코드 .py 또는 패키징된 .exe)에 따라 
    올바른 리소스 기본 경로를 가져오는 함수입니다.
    PyInstaller로 패키징된 .exe 파일은 실행 시 임시 폴더에 압축이 풀리는데,
    이 함수의 try-except 구문은 그 환경을 감지하여 올바른 경로를 반환합니다.
    """
    if getattr(sys, 'frozen', False):
        # 프로그램이 .exe 파일로 '얼려져(frozen)' 실행될 경우,
        # sys._MEIPASS는 PyInstaller가 생성한 임시 폴더의 경로를 가리킵니다.
        # 모든 리소스는 이 임시 폴더를 기준으로 경로를 계산해야 합니다.
        return sys._MEIPASS
    else:
        # .py 스크립트로 직접 실행하는 개발 환경의 경우,
        # 이 파일의 위치를 기준으로 상위 폴더(agent/)를 기본 경로로 사용합니다.
        return os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# 이 함수를 호출하여 모든 경로 계산의 기준점으로 사용합니다.
BASE_PATH = get_base_path()

# 설치에 필요한 리소스 파일들의 전체 경로를 정의합니다.
RESOURCES_DIR = os.path.join(BASE_PATH, 'resources')
CONFIG_DIR = os.path.join(BASE_PATH, 'config')
SYSMON_EXE = os.path.join(RESOURCES_DIR, 'Sysmon.exe')
SYSMON_CONFIG_XML = os.path.join(CONFIG_DIR, 'sysmon_config.xml')
NPCAP_INSTALLER = os.path.join(RESOURCES_DIR, 'Npcap-1.82.exe')
WINLOGBEAT_ZIP = os.path.join(RESOURCES_DIR, 'winlogbeat-9.0.3-windows-x86_64.zip')
PACKETBEAT_ZIP = os.path.join(RESOURCES_DIR, 'packetbeat-9.0.3-windows-x86_64.zip')
NSSM_EXE = os.path.join(RESOURCES_DIR, 'nssm.exe')

# 설치 시 복사될 설정 파일 템플릿의 경로를 정의합니다.
WINLOGBEAT_CONFIG_YML_TEMPLATE = os.path.join(CONFIG_DIR, 'winlogbeat.yml')
PACKETBEAT_CONFIG_YML_TEMPLATE = os.path.join(CONFIG_DIR, 'packetbeat.yml')

# 프로그램이 최종적으로 설치될 기본 디렉토리 경로를 정의합니다.
# (예: C:\Program Files\AttackDetectionAgent)
INSTALL_BASE_DIR = os.path.join(os.environ.get('ProgramFiles', 'C:\\Program Files'), 'AttackDetectionAgent')
WINLOGBEAT_INSTALL_DIR = os.path.join(INSTALL_BASE_DIR, 'Winlogbeat')
PACKETBEAT_INSTALL_DIR = os.path.join(INSTALL_BASE_DIR, 'Packetbeat')

# --- 에이전트 메인 프로그램 및 서비스 이름 정의 ---
AGENT_EXE_NAME = "agent_installer.exe" # PyInstaller로 빌드된 메인 실행 파일 이름
AGENT_EXE_PATH = os.path.join(INSTALL_BASE_DIR, AGENT_EXE_NAME)
REMEDIATOR_SERVICE_NAME = "AttackDetectionRemediator"
REMEDIATOR_DISPLAY_NAME = "Attack Detection Remediator Service"

# ==============================================================================
# 헬퍼 함수
# ==============================================================================

def is_admin() -> bool:
    """현재 스크립트가 관리자 권한으로 실행 중인지 확인합니다."""
    try:
        # Windows API를 호출하여 현재 사용자가 관리자 그룹에 속해 있는지 확인합니다.
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def run_command(command_list: list[str], check: bool = True):
    """
    주어진 명령어를 시스템에서 실행하고 그 결과를 반환하는 유틸리티 함수입니다.
    """
    print(f"명령 실행: {' '.join(command_list)}")
    try:
        # Windows에서 실행 시 불필요한 콘솔 창이 뜨지 않도록 설정합니다.
        creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        result = subprocess.run(
            command_list,       # 실행할 명령어 리스트 (예: ['net', 'stop', 'myservice'])
            capture_output=True,# 표준 출력과 표준 오류를 캡처합니다.
            text=True,          # 결과를 텍스트(문자열)로 받습니다.
            check=check,        # 명령이 0이 아닌 코드로 종료되면 예외를 발생시킵니다.
            encoding='cp949',   # Windows 한글 출력이 깨지지 않도록 인코딩을 지정합니다.
            errors='replace',
            creationflags=creationflags
        )
        if result.returncode != 0 and check:
            print(f"명령 실패 (코드 {result.returncode}): {result.stderr.strip()}")
        return result
    except Exception as e:
        print(f"ERROR: 명령 실행 중 오류 발생: {e}")
        return subprocess.CompletedProcess(command_list, 1, stderr=str(e))

def stop_service(service_name: str):
    """지정된 윈도우 서비스를 중지시킵니다. 서비스가 없으면 조용히 넘어갑니다."""
    print(f"서비스 중지 시도: {service_name}...")
    # 'check=False'를 사용하여 서비스가 없거나 이미 중지된 경우 오류를 내지 않고 계속 진행합니다.
    run_command(['net', 'stop', service_name], check=False)
    time.sleep(2) # 서비스가 완전히 종료될 시간을 벌어줍니다.

def find_main_network_interface(packetbeat_exe_path: str) -> str:
    """
    packetbeat devices 명령을 실행하여, 여러 네트워크 카드 중 실제 인터넷에 연결된
    주 네트워크 인터페이스의 인덱스 번호를 자동으로 찾아 반환합니다.
    """
    print("주 네트워크 인터페이스를 자동으로 탐색합니다...")
    try:
        if not os.path.exists(packetbeat_exe_path):
            print(f"ERROR: packetbeat.exe를 찾을 수 없습니다: {packetbeat_exe_path}")
            return "0"
        cmd = [packetbeat_exe_path, 'devices']
        result = run_command(cmd, check=True)
        for line in result.stdout.splitlines():
            # 'Ethernet', 'Wi-Fi' 등 일반적인 어댑터 이름을 포함하고, 가상 어댑터를 제외하여 필터링합니다.
            if any(kw in line for kw in ['Ethernet', 'Wi-Fi', 'Realtek', 'Intel']) and \
               not any(ex in line for ex in ['Loopback', 'VPN', 'WAN Miniport', 'Virtual']):
                # 정규식을 사용해 라인의 시작 부분에 있는 인덱스 번호를 추출합니다.
                match = re.match(r'^(\d+):', line.strip())
                if match:
                    device_index = match.group(1)
                    print(f"주 네트워크 인터페이스를 찾았습니다: Index {device_index} ({line.strip()})")
                    return device_index
    except Exception as e:
        print(f"ERROR: 네트워크 인터페이스 탐색 중 오류 발생: {e}")
    print("경고: 주 네트워크 인터페이스를 자동으로 찾지 못했습니다. 기본값 '0'을 사용합니다.")
    return "0"

# ==============================================================================
# 설치/제거 함수
# ==============================================================================

def install_npcap() -> bool:
    """Npcap이 설치되지 않았을 경우에만 설치를 진행합니다."""
    # Npcap 드라이버 파일의 기본 설치 경로를 확인합니다.
    npcap_driver_path = os.path.join(os.environ.get("SystemRoot", "C:\\Windows"), "System32", "drivers", "npcap.sys")
    if os.path.exists(npcap_driver_path):
        print("Npcap이 이미 설치되어 있습니다. 설치를 건너뜁니다.")
        return True
    
    print("Npcap이 설치되어 있지 않습니다. 설치를 시작합니다.")
    print("설치 마법사가 나타나면 직접 설치를 완료해주세요...")
    if not os.path.exists(NPCAP_INSTALLER):
        print(f"ERROR: Npcap 설치 파일이 없습니다: {NPCAP_INSTALLER}")
        return False
    cmd = [NPCAP_INSTALLER]
    result = run_command(cmd, check=False) # 사용자가 직접 설치하므로 check=False로 설정
    if result.returncode == 0:
        print("Npcap 설치 프로세스가 완료되었습니다.")
        return True
    else:
        print(f"Npcap 설치 프로세스가 코드로 종료되었습니다: {result.returncode}. (사용자 취소 또는 오류)")
        return True

def install_sysmon() -> bool:
    """Sysmon을 설치하거나, 이미 설치된 경우 설정을 업데이트합니다."""
    print("Sysmon 설치를 시도합니다...")
    cmd = [SYSMON_EXE, '-i', SYSMON_CONFIG_XML, '-accepteula']
    result = run_command(cmd, check=False)
    if result.returncode == 0:
        print("Sysmon 설치 성공.")
        return True
    # 이미 설치된 경우, 오류 메시지를 확인하여 업데이트 로직을 호출합니다.
    elif "already installed" in result.stderr.lower():
        print("Sysmon이 이미 설치되어 있습니다. 설정을 업데이트합니다.")
        return update_sysmon_config()
    else:
        print(f"Sysmon 설치 실패 (코드 {result.returncode}): {result.stderr}")
        return False

def update_sysmon_config() -> bool:
    """Sysmon 설정을 업데이트합니다."""
    print("Sysmon 설정을 업데이트합니다...")
    cmd = [SYSMON_EXE, '-c', SYSMON_CONFIG_XML]
    result = run_command(cmd)
    success = result.returncode == 0
    print(f"Sysmon 설정 업데이트 {'성공' if success else '실패'}.")
    return success

def uninstall_sysmon() -> bool:
    """Sysmon을 제거합니다."""
    print("Sysmon 제거를 시도합니다...")
    cmd = [SYSMON_EXE, '-u', 'force']
    run_command(cmd, check=False)
    print(f"Sysmon 제거 완료.")
    return True

def install_beat(beat_name: str, beat_zip_path: str, beat_install_dir: str, beat_config_yml_template: str) -> bool:
    """Winlogbeat 또는 Packetbeat를 설치하고 서비스로 등록합니다."""
    print(f"{beat_name} 설치를 시도합니다...")

    # 1. 기존 디렉토리 확실하게 제거 (오류 발생 시 재시도)
    if os.path.exists(beat_install_dir):
        print(f"기존 {beat_name} 디렉토리를 삭제합니다...")
        shutil.rmtree(beat_install_dir, ignore_errors=True)
        time.sleep(1)

    # 2. 설치 디렉토리 생성
    os.makedirs(beat_install_dir, exist_ok=True)

    # 3. ZIP 파일 압축 해제
    try:
        print(f"{beat_name} ZIP 파일 압축을 해제합니다...")
        with zipfile.ZipFile(beat_zip_path, 'r') as zip_ref:
            zip_ref.extractall(beat_install_dir)

        # Beat zip 파일은 보통 'beat-name-version-os' 형태의 상위 폴더를 가집니다.
        # 압축 해제 후 내용물을 부모 폴더로 이동시키고, 빈 상위 폴더를 삭제합니다.
        extracted_folder_name = os.path.splitext(os.path.basename(beat_zip_path))[0]
        extracted_folder_path = os.path.join(beat_install_dir, extracted_folder_name)
        if os.path.isdir(extracted_folder_path):
            print(f"'{extracted_folder_name}' 폴더의 내용물을 상위로 이동합니다...")
            for item in os.listdir(extracted_folder_path):
                shutil.move(os.path.join(extracted_folder_path, item), beat_install_dir)
            os.rmdir(extracted_folder_path)
 
    except Exception as e:
        print(f"ERROR: {beat_name} 압축 해제 중 오류 발생: {e}")
        return False

    # 4. 설정 파일 동적 생성 및 복사
    final_config_path = os.path.join(beat_install_dir, f"{beat_name}.yml")
    if beat_name == "packetbeat":
        packetbeat_exe_path = os.path.join(beat_install_dir, "packetbeat.exe")
        device_index = find_main_network_interface(packetbeat_exe_path)
        with open(beat_config_yml_template, 'r', encoding='utf-8') as f:
            config_content = f.read()
        config_content = config_content.replace("device: any", f"device: {device_index}")
        with open(final_config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
    else:
        shutil.copy(beat_config_yml_template, final_config_path)
    print(f"{beat_name} 파일 복사 및 설정 완료.")

    # 5. 서비스 등록 및 시작
    print(f"{beat_name} 서비스를 등록하고 시작합니다...")
    ps_script_path = os.path.join(beat_install_dir, f"install-service-{beat_name}.ps1")
    cmd = ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', ps_script_path]
    result = run_command(cmd, check=False)

    if "already exists" in result.stdout.lower():
        print(f"{beat_name} 서비스가 이미 등록되어 있습니다.")
        run_command(['sc', 'stop', beat_name], check=False)
        time.sleep(2)
    elif result.returncode != 0:
        print(f"{beat_name} 서비스 등록 실패: {result.stderr}")
        return False

    print(f"서비스를 시작합니다.")
    start_result = run_command(['sc', 'start', beat_name], check=False)
    if start_result.returncode == 0 or "already been started" in start_result.stderr.lower():
        print(f"{beat_name} 서비스 시작 성공.")
        return True
    else:
        print(f"{beat_name} 서비스 시작 실패: {start_result.stderr}")
        # 서비스 시작 실패 시, 더 자세한 정보 확인을 위해 이벤트 로그를 조회합니다.
        run_command(['powershell.exe', '-Command', f'Get-EventLog -LogName Application -Source "{beat_name}" -Newest 1 | Format-List'], check=False)
        return False

def uninstall_beat(beat_name: str, beat_install_dir: str) -> bool:
    """Winlogbeat 또는 Packetbeat 서비스를 제거하고 설치 디렉토리를 삭제합니다."""
    print(f"{beat_name} 제거를 시도합니다...")
    if not os.path.exists(beat_install_dir):
        print(f"{beat_name}이(가) 설치되어 있지 않습니다.")
        return True

    # 1. PowerShell 스크립트로 서비스 제거
    ps_script_path = os.path.join(beat_install_dir, "uninstall-service.ps1")
    if os.path.exists(ps_script_path):
        run_command(['powershell.exe', '-ExecutionPolicy', 'Bypass', '-File', ps_script_path], check=False)
        
    # 2. taskkill로 '좀비 프로세스' 강제 종료
    print(f"{beat_name}.exe 프로세스를 강제 종료합니다...")
    run_command(['taskkill', '/F', '/IM', f'{beat_name}.exe'], check=False)
    time.sleep(1)

    # 3. 폴더 삭제 (재시도 로직 포함)
    print(f"{beat_name} 설치 폴더를 삭제합니다...")
    for i in range(3):
        try:
            if os.path.exists(beat_install_dir):
                shutil.rmtree(beat_install_dir)
            break
        except OSError as e:
            print(f"Error removing directory {beat_install_dir} (Attempt {i+1}/3): {e}")
            time.sleep(1)

    print(f"{beat_name} 제거 완료.")
    return True

def install_remediator_service() -> bool:
    """NSSM을 사용하여 실시간 대응 모듈을 Windows 서비스로 등록합니다."""
    print("NSSM을 사용하여 실시간 대응 서비스를 등록합니다...")

    # 1. NSSM 실행 파일을 설치 폴더로 복사하여, 신뢰할 수 있는 위치에서 실행합니다.
    nssm_install_path = os.path.join(INSTALL_BASE_DIR, "nssm.exe")
    try:
        shutil.copy(NSSM_EXE, nssm_install_path)
    except Exception as e:
        print(f"ERROR: nssm.exe 복사 실패: {e}")
        return False

    # 2. NSSM으로 서비스 설치 (실행 파일과 인자 지정)
    cmd_install = [nssm_install_path, 'install', REMEDIATOR_SERVICE_NAME, AGENT_EXE_PATH, 'run']
    result_install = run_command(cmd_install, check=False)

    if result_install.returncode != 0:
        # 서비스가 이미 존재할 경우, 기존 설정을 사용하기 위해 오류를 무시할 수 있습니다.
        if "already exists" not in result_install.stderr.lower():
             print(f"{REMEDIATOR_SERVICE_NAME} 서비스 등록 실패: {result_install.stderr}")
             return False
        else:
             print(f"{REMEDIATOR_SERVICE_NAME} 서비스가 이미 존재합니다. 설정을 업데이트합니다.")

    # 3. 서비스 상세 설정 (표시 이름, 시작 유형)
    run_command([nssm_install_path, 'set', REMEDIATOR_SERVICE_NAME, 'DisplayName', f'{REMEDIATOR_DISPLAY_NAME}'])
    run_command([nssm_install_path, 'set', REMEDIATOR_SERVICE_NAME, 'Start', 'SERVICE_DELAYED_AUTO_START'])

    # 4. 서비스 시작
    print(f"{REMEDIATOR_SERVICE_NAME} 서비스를 시작합니다...")
    start_result = run_command(['sc', 'start', REMEDIATOR_SERVICE_NAME], check=False)
    if start_result.returncode == 0 or "already been started" in start_result.stderr.lower():
        print(f"{REMEDIATOR_SERVICE_NAME} 서비스 시작 성공.")
        return True
    else:
        print(f"{REMEDIATOR_SERVICE_NAME} 서비스 시작 실패: {start_result.stderr}")
        return False

def uninstall_remediator_service() -> bool:
    """NSSM을 사용하여 실시간 대응 서비스를 제거합니다."""
    print("실시간 대응 서비스를 제거합니다...")
    nssm_install_path = os.path.join(INSTALL_BASE_DIR, "nssm.exe")
    if os.path.exists(nssm_install_path):
        # NSSM의 remove 명령어를 사용하여 서비스를 안전하게 제거합니다.
        run_command([nssm_install_path, 'remove', REMEDIATOR_SERVICE_NAME, 'confirm'], check=False)
    return True

def main_installer_logic(action: str):
    """
    통합 설치/제거 로직의 메인 진입점입니다.
    전달된 action 값('install' 또는 'uninstall')에 따라 전체 프로세스를 조율합니다.
    """
    print(f"--- 에이전트 내부 설치/제거({action}) 시작 ---")
    
    if action == "install":
        # 1. 필요한 프로그램들을 순차적으로 설치합니다.
        install_npcap()
        install_sysmon()
        install_beat("winlogbeat", WINLOGBEAT_ZIP, WINLOGBEAT_INSTALL_DIR, WINLOGBEAT_CONFIG_YML_TEMPLATE)
        install_beat("packetbeat", PACKETBEAT_ZIP, PACKETBEAT_INSTALL_DIR, PACKETBEAT_CONFIG_YML_TEMPLATE)
        install_remediator_service() # 실시간 대응 서비스 설치

    elif action == "uninstall":
        # 2. 설치된 프로그램과 서비스를 역순으로 제거합니다.
        services_to_manage = [REMEDIATOR_SERVICE_NAME, "packetbeat", "winlogbeat"]
        for service in services_to_manage:
            stop_service(service)
        
        uninstall_remediator_service()
        uninstall_beat("packetbeat", PACKETBEAT_INSTALL_DIR)
        uninstall_beat("winlogbeat", WINLOGBEAT_INSTALL_DIR)
        uninstall_sysmon()
    else:
        print(f"유효하지 않은 액션: {action}")
        
    print(f"--- 에이전트 내부 설치/제거({action}) 완료 ---")

# --- 스크립트 실행 진입점 ---
if __name__ == "__main__":
    # 1. 관리자 권한이 있는지 확인합니다.
    if is_admin():
        # 2. 관리자 권한이 있으면, 메인 로직을 실행합니다.
        # 실행 시 전달된 인자가 없으면 기본값으로 'install'을 사용합니다.
        action = sys.argv[1] if len(sys.argv) > 1 else "install"
        main_installer_logic(action)
        print("설치가 완료되었습니다.")
        for i in range(5, 0, -1):
            # 캐리지 리턴(\r)을 사용하여 같은 줄에 덮어쓰는 효과를 줍니다.
            sys.stdout.write(f"\r > {i}초 후에 이 창은 자동으로 닫힙니다... ")
            sys.stdout.flush() # 버퍼를 비워 즉시 출력되도록 합니다.
            time.sleep(1)
    else:
        # 3. 관리자 권한이 없으면, UAC 프롬프트를 띄워 스크립트를 관리자 권한으로 다시 실행합니다.
        print("관리자 권한이 필요합니다. 권한 상승을 요청합니다...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
