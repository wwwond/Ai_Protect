import json
import os
from datetime import datetime

def write_log_to_file(message: str, log_dir: str, filename: str = "agent_log.log") -> None:
    """
    에이전트의 로그 메시지를 지정된 디렉토리의 파일에 추가합니다.
    오류 발생 시 콘솔에도 출력합니다.
    """
    os.makedirs(log_dir, exist_ok=True) # 디렉토리가 없으면 생성
    filepath = os.path.join(log_dir, filename)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(filepath, "a", encoding="utf-8") as f: # "a" 모드는 파일 끝에 추가
            f.write(f"[{timestamp}] {message}\n")
    except Exception as e:
        print(f"Error writing to log file {filepath}: {e}") # 로그 파일에 못쓰면 콘솔에 출력

def save_json_to_file(data: dict, directory: str, filename_prefix: str = "data") -> None:
    """
    주어진 딕셔너리 데이터를 JSON 형식으로 파일에 저장합니다.
    (비동기가 아닌 동기 함수로 구현되어 있습니다.)
    """
    os.makedirs(directory, exist_ok=True) # 디렉토리가 없으면 생성
    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{filename_prefix}_{timestamp_str}.json"
    filepath = os.path.join(directory, filename)
    try:
        with open(filepath, mode="w", encoding="utf-8") as f: # "w" 모드는 파일 덮어쓰기
            json.dump(data, f, indent=2, ensure_ascii=False) # indent=2로 가독성 높임
        write_log_to_file(f"Data saved to {filepath}", directory)
    except Exception as e:
        write_log_to_file(f"Error saving data to file {filepath}: {e}", directory)