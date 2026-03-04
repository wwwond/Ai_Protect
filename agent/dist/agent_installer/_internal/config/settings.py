import os

class AgentSettings:
    """
    에이전트 설치 관리자(main_installer.py)의 설정을 정의하는 클래스입니다.
    """
    # --- 에이전트 설치/제거 로그 파일 저장 경로 ---
    # main_installer.py가 실행 로그를 기록할 디렉토리입니다.
    # 에이전트 루트 디렉토리 아래에 'logs' 폴더를 생성합니다.
    # os.path.dirname(__file__) -> 현재 파일이 있는 'config' 폴더
    # '..' -> 상위 폴더인 'agent'
    # '..' -> 상위 폴더인 'FinalProject' (가정) -> 이 부분이 환경에 따라 달라질 수 있음
    # 더 안정적인 방법은 agent 루트를 기준으로 경로를 잡는 것입니다.
    
    # agent 폴더 내에 logs 폴더를 생성하도록 경로를 수정합니다.
    AGENT_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    AGENT_LOG_DIR: str = os.path.join(AGENT_ROOT_DIR, "logs")
    
    # 로그 디렉토리가 없으면 생성합니다.
    os.makedirs(AGENT_LOG_DIR, exist_ok=True)

# AgentSettings 클래스의 인스턴스를 생성하여 프로그램 전체에서 설정값에 접근할 수 있도록 합니다.
settings = AgentSettings()