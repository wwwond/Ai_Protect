# ip, port 제어 함수

import subprocess

def _run_command(command: str) -> dict:
    """
    Windows 명령어를 문자열 형태로 실행하고 결과를 딕셔너리로 반환하는 헬퍼 함수입니다.
    """
    try:
        # Windows에서 실행 시 불필요한 콘솔 창이 뜨지 않도록 설정합니다.
        creationflags = subprocess.CREATE_NO_WINDOW
        result = subprocess.run(
            command, shell=True, check=False, # check=False로 하여 오류를 직접 처리합니다.
            capture_output=True, text=True,
            creationflags=creationflags, encoding='cp949', errors='replace'
        )
        # 명령 실행 결과를 딕셔너리로 정리하여 반환합니다.
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip()
        }
    except Exception as e:
        print(f"[Firewall] 명령어 실행 중 예외 발생: {e}")
        return {"success": False, "message": str(e)}

def _rule_exists(rule_name: str) -> bool:
    """주어진 이름의 방화벽 규칙이 존재하는지 확인합니다."""
    # 'show rule' 명령어를 사용하여 규칙의 존재 여부를 확인합니다.
    # 명령이 성공하면(True) 규칙이 있는 것이고, 실패하면(False) 없는 것입니다.
    return _run_command(f'netsh advfirewall firewall show rule name="{rule_name}"')["success"]

def block_ip(ip: str) -> bool:
    """IP 차단 규칙이 없을 경우에만 새로 추가합니다."""
    print(f"[Firewall] IP {ip} 차단을 시도합니다...")
    rule_name_in = f"BLOCK_IP_{ip}_IN_(Auto)"
    rule_name_out = f"BLOCK_IP_{ip}_OUT_(Auto)"

    # --- Inbound 규칙 처리 ---
    if not _rule_exists(rule_name_in):
        cmd_in = f'netsh advfirewall firewall add rule name="{rule_name_in}" dir=in interface=any action=block remoteip={ip}'
        _run_command(cmd_in)
    else:
        print(f"[Firewall] Inbound 규칙 '{rule_name_in}'은 이미 존재합니다.")
        
    # --- Outbound 규칙 처리 ---
    if not _rule_exists(rule_name_out):
        cmd_out = f'netsh advfirewall firewall add rule name="{rule_name_out}" dir=out interface=any action=block remoteip={ip}'
        _run_command(cmd_out)
    else:
        print(f"[Firewall] Outbound 규칙 '{rule_name_out}'은 이미 존재합니다.")

    # 두 규칙이 모두 존재하는지 다시 확인하여 최종 성공 여부를 판단합니다.
    if _rule_exists(rule_name_in) and _rule_exists(rule_name_out):
        print(f"[Firewall] IP {ip} 차단 규칙 적용 성공")
        return True
    else:
        print(f"[Firewall] IP {ip} 차단 규칙 적용 실패")
        return False

def unblock_ip(ip: str) -> bool:
    """IP 차단 규칙을 삭제합니다."""
    print(f"[Firewall] IP {ip} 차단 해제를 시도합니다...")
    rule_name_in = f"BLOCK_IP_{ip}_IN_(Auto)"
    rule_name_out = f"BLOCK_IP_{ip}_OUT_(Auto)"

    # 각 규칙이 존재할 경우에만 삭제를 시도합니다.
    if _rule_exists(rule_name_in):
        _run_command(f'netsh advfirewall firewall delete rule name="{rule_name_in}"')
    if _rule_exists(rule_name_out):
        _run_command(f'netsh advfirewall firewall delete rule name="{rule_name_out}"')
        
    # 두 규칙이 모두 없는지 다시 확인하여 최종 성공 여부를 판단합니다.
    if not _rule_exists(rule_name_in) and not _rule_exists(rule_name_out):
        print(f"[Firewall] IP {ip} 차단 해제 성공")
        return True
    else:
        print(f"[Firewall] IP {ip} 차단 해제 실패")
        return False

def block_port(port: int) -> bool:
    """포트 차단 규칙이 없을 경우에만 새로 추가합니다."""
    print(f"[Firewall] Port {port} 차단을 시도합니다...")
    rule_name = f"BLOCK_PORT_{port}_(Auto)"

    if _rule_exists(rule_name):
        print(f"[Firewall] Port {port}는 이미 차단되어 있습니다.")
        return True

    cmd = f'netsh advfirewall firewall add rule name="{rule_name}" dir=in protocol=TCP localport={port} action=block'
    if _run_command(cmd)["success"]:
        print(f"[Firewall] Port {port} 차단 성공")
        return True
    else:
        print(f"[Firewall] Port {port} 차단 실패")
        return False

def unblock_port(port: int) -> bool:
    """포트 차단 규칙을 삭제합니다."""
    print(f"[Firewall] Port {port} 차단 해제를 시도합니다...")
    rule_name = f"BLOCK_PORT_{port}_(Auto)"

    if not _rule_exists(rule_name):
        print(f"[Firewall] Port {port}에 대한 차단 규칙이 원래 없습니다.")
        return True

    cmd = f'netsh advfirewall firewall delete rule name="{rule_name}"'
    if _run_command(cmd)["success"]:
        print(f"[Firewall] Port {port} 차단 해제 성공")
        return True
    else:
        print(f"[Firewall] Port {port} 차단 해제 실패")
        return False
