# # backend/app/api/agent_registration.py

# from typing import Annotated
# from fastapi import APIRouter, Depends, HTTPException

# # User 모델과 실제 JWT 토큰 검증 함수를 가져옵니다.
# from app.models.models import User
# from src.utils.auth import get_current_user

# router = APIRouter(
#     prefix="/agent",
#     tags=["Agent_Management_registration"]
# )

# @router.post("/register", summary="에이전트 ID 요청 (최초 실행 시)")
# def get_agent_id_for_registration(
#     # 이 API는 반드시 유효한 JWT 토큰을 가진 사용자만 호출할 수 있습니다.
#     current_user: Annotated[User, Depends(get_current_user)]
# ):
#     """
#     에이전트가 설치 후 최초 실행 시, 자신의 JWT 토큰을 이용해 이 API를 호출합니다.
#     서버는 토큰을 검증하여, 해당 사용자의 고유 ID를 에이전트에게 반환합니다.
#     """
#     if not current_user.user_id:
#         raise HTTPException(status_code=404, detail="User ID not found in token.")
        
#     # 토큰에서 추출한 사용자 ID를 에이전트의 고유 ID로 사용하도록 반환합니다.
#     return {"agent_id": current_user.user_id}
