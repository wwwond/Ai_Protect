# fastapi/app/api/updates.py 에이전트 자동 업데이트

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class UpdateInfo(BaseModel):
    version: str
    download_url: str

# 나중에 새 버전이 나오면 여기 버전과 URL만 수정하면 됩니다.
LATEST_UPDATE_INFO = {
    "version": "1.0.0", # 이것이 현재 최신 버전입니다.
    "download_url": "http://210.119.12.96:8000/downloads/Agent_Setup_1.0.0.exe"
}

@router.get("/agent/latest", response_model=UpdateInfo, summary="Get Latest Agent Version Info")
def get_latest_agent_version():
    """
    에이전트의 최신 버전 정보와 다운로드 URL을 반환합니다.
    """
    return LATEST_UPDATE_INFO