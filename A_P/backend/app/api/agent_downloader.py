# backend/app/api/agent_downloader.py

import os
import shutil
import zipfile
import tempfile
from typing import Annotated

# BackgroundTasks를 import 합니다.
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer

# User 모델과 get_current_user 함수를 가져옵니다.
from app.models.models import User
from src.utils.auth import get_current_user

router = APIRouter(
    prefix="/agent",
    tags=["Agent_Management_Downloads"],
)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) 
GENERIC_AGENT_INSTALLER_PATH = os.path.join(PROJECT_ROOT, "downloads", "Agent_Setup_1.0.0.exe")

@router.get("/download", response_class=FileResponse, summary="에이전트 설치 패키지 다운로드")
async def download_agent_package(
    background_tasks: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)]
):
    temp_dir = tempfile.mkdtemp()
    try:
        # 1. 압축할 실제 내용물만 담을 하위 폴더를 생성합니다.
        content_dir = os.path.join(temp_dir, "package_content")
        os.makedirs(content_dir)

        # 2. 미리 빌드된 설치 파일을 'content_dir'로 복사합니다.
        if not os.path.exists(GENERIC_AGENT_INSTALLER_PATH):
            shutil.rmtree(temp_dir)
            raise FileNotFoundError("Generic agent installer not found on the server.")

        installer_name = os.path.basename(GENERIC_AGENT_INSTALLER_PATH)
        # 복사 위치를 content_dir로 변경
        temp_installer_path = os.path.join(content_dir, installer_name)
        shutil.copy(GENERIC_AGENT_INSTALLER_PATH, temp_installer_path)

        # 3. 토큰 파일을 'content_dir'에 저장합니다.
        # 파일 경로를 content_dir로 변경
        token_file_path = os.path.join(content_dir, "token.txt")
        with open(token_file_path, "w", encoding="utf-8") as f:
            f.write(str(current_user.user_id))

        # 4. 'content_dir'를 대상으로 압축을 실행합니다.
        zip_filename = "AttackDetectionAgent-Installer.zip"
        archive_path = shutil.make_archive(
            # 최종 zip 파일은 temp_dir에 생성
            base_name=os.path.join(temp_dir, "agent_package"),
            format='zip',
            # 압축할 대상 폴더는 content_dir로 지정
            root_dir=content_dir
        )
        
        background_tasks.add_task(shutil.rmtree, temp_dir)
        
        return FileResponse(
            path=archive_path, 
            filename=zip_filename, 
            media_type='application/zip'
        )

    except Exception as e:
        shutil.rmtree(temp_dir)
        print(f"Error creating agent package: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent package.")