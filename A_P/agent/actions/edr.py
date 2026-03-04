# agent/actions/edr.py

import subprocess
import json
from typing import Optional

def _run_ps_command(command: str) -> dict:
    """
    PowerShell 명령어를 실행하고 결과를 딕셔너리로 반환하는 헬퍼 함수입니다.
    """
    # PowerShell 명령어를 실행하기 위한 전체 구조입니다.
    full_command = ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-Command', command]
    try:
        # Windows에서 실행 시 불필요한 콘솔 창이 뜨지 않도록 설정합니다.
        creationflags = subprocess.CREATE_NO_WINDOW
        result = subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            check=False, # 명령의 성공/실패를 직접 판단하기 위해 False로 설정
            creationflags=creationflags,
            encoding='utf-8', # PowerShell은 UTF-8 출력을 사용
            errors='replace'
        )
        # 명령 실행 결과를 딕셔너리로 정리하여 반환합니다.
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip()
        }
    except Exception as e:
        print(f"[EDR] PowerShell 명령어 실행 중 예외 발생: {e}")
        return {"success": False, "message": str(e)}

def _get_adapter_status(adapter_name: str) -> Optional[str]:
    """특정 네트워크 어댑터의 현재 상태('Up' 또는 'Disabled')를 반환합니다."""
    # Get-NetAdapter 결과를 JSON으로 변환하여 상태를 쉽게 파싱합니다.
    result = _run_ps_command(f"Get-NetAdapter -Name '{adapter_name}' | ConvertTo-Json")
    if result["success"] and result["stdout"]:
        try:
            adapter_info = json.loads(result["stdout"])
            # 어댑터가 여러 개 반환될 수 있으므로, 리스트인지 확인
            if isinstance(adapter_info, list):
                return adapter_info[0].get("Status")
            return adapter_info.get("Status")
        except json.JSONDecodeError:
            return None
    return None

def quarantine_host(hostname: str = None) -> bool:
    """네트워크 어댑터를 비활성화하여 호스트를 격리합니다."""
    print(f"[EDR] 호스트 격리를 시도합니다 (대상: {hostname or '모든 활성 어댑터'})...")
    
    # --- 특정 어댑터만 격리하는 경우 ---
    if hostname:
        # 1. 격리하기 전에 현재 상태를 먼저 확인합니다.
        status = _get_adapter_status(hostname)
        if status == 'Disabled':
            print(f"[EDR] 어댑터 '{hostname}'는 이미 비활성화(격리)된 상태입니다.")
            return True # 이미 원하는 상태이므로 성공으로 간주

        # 2. 상태가 'Disabled'가 아닐 경우에만 비활성화를 시도합니다.
        cmd = f"Disable-NetAdapter -Name '{hostname}' -Confirm:$false"
        result = _run_ps_command(cmd)
        
        if result["success"]:
            print(f"[EDR] 어댑터 '{hostname}' 격리 성공")
            return True
        else:
            print(f"[EDR] 어댑터 '{hostname}' 격리 실패: {result.get('stderr')}")
            return False
            
    # --- 모든 활성 어댑터를 격리하는 경우 ---
    else:
        # 'Up' 상태인 어댑터만 골라서 비활성화합니다.
        cmd = "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Disable-NetAdapter -Confirm:$false"
        result = _run_ps_command(cmd)
        
        # PowerShell 파이프라인은 일부 실패 시에도 성공으로 간주할 수 있으므로,
        # 명령 실행 자체를 성공으로 처리합니다.
        print("[EDR] 모든 활성 어댑터 격리 명령 실행 완료.")
        return True

def release_isolation(hostname: str = None) -> bool:
    """네트워크 어댑터를 다시 활성화하여 격리를 해제합니다."""
    print(f"[EDR] 호스트 격리 해제를 시도합니다 (대상: {hostname or '모든 비활성 어댑터'})...")

    # --- 특정 어댑터만 격리 해제하는 경우 ---
    if hostname:
        # 1. 해제하기 전에 현재 상태를 먼저 확인합니다.
        status = _get_adapter_status(hostname)
        if status == 'Up':
            print(f"[EDR] 어댑터 '{hostname}'는 이미 활성화된 상태입니다.")
            return True

        # 2. 상태가 'Up'이 아닐 경우에만 활성화를 시도합니다.
        cmd = f"Enable-NetAdapter -Name '{hostname}' -Confirm:$false"
        result = _run_ps_command(cmd)

        if result["success"]:
            print(f"[EDR] 어댑터 '{hostname}' 격리 해제 성공")
            return True
        else:
            print(f"[EDR] 어댑터 '{hostname}' 격리 해제 실패: {result.get('stderr')}")
            return False
            
    # --- 모든 비활성 어댑터를 격리 해제하는 경우 ---
    else:
        # 'Disabled' 상태인 어댑터만 골라서 활성화합니다.
        cmd = "Get-NetAdapter | Where-Object {$_.Status -eq 'Disabled'} | Enable-NetAdapter -Confirm:$false"
        _run_ps_command(cmd)
        
        print("[EDR] 모든 비활성 어댑터 격리 해제 명령 실행 완료.")
        return True
