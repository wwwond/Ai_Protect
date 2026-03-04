# src/routes/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated # Python 3.9+에서 Depends와 함께 사용
from elasticsearch import Elasticsearch

# 상대 경로 임포트
from ..schemas.user import UserResponse, UserUpdate # 사용자 응답/업데이트 스키마
from ..models.models import User # ORM 모델 (user_model 대신 직접 User 임포트)
from ..utils.auth import get_current_user # 현재 사용자 가져오는 의존성
from ..core.database import get_db # DB 세션 의존성
from ..services import user_service # 사용자 서비스 임포트

# --- 설정 파일 임포트 ---
from ..core.config import settings # Settings 객체 임포트


# --- 설정 ---
# APIRouter 인스턴스 생성 (중복 제거, prefix="/users" 유지)
router = APIRouter(prefix="/users", tags=["Users"])

es_client = Elasticsearch(
    f"{settings.elasticsearch_host}:{settings.elasticsearch_port}",
    request_timeout=settings.elasticsearch_request_timeout
)

# ----------------------------------------------------
# 1. 현재 사용자 정보 조회 (GET /users/me)
# ----------------------------------------------------
@router.get("/me", response_model=UserResponse, summary="현재 사용자 정보 조회")
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    """
    현재 로그인한 사용자의 상세 정보를 조회합니다.
    """
    return UserResponse.model_validate(current_user)

# ----------------------------------------------------
# 2. 사용자 정보 업데이트 (PUT /users/me)
# ----------------------------------------------------
@router.put("/me", response_model=UserResponse, summary="현재 사용자 정보 업데이트")
async def update_users_me(
    user_update: UserUpdate, # 업데이트할 정보
    current_user: Annotated[User, Depends(get_current_user)], # 현재 로그인된 사용자
    db: Annotated[Session, Depends(get_db)] # DB 세션
):
    """
    현재 로그인한 사용자의 정보를 업데이트합니다.
    이메일 또는 사원 번호 변경 시 중복을 확인합니다.
    """
    # 이메일 변경 시 중복 확인 (새로운 이메일이 현재 사용자의 이메일이 아니고, DB에 이미 존재하는 경우)
    if user_update.email is not None and user_update.email != current_user.email:
        existing_user_by_email = user_service.get_user_by_email(db, user_update.email)
        if existing_user_by_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New email is already registered",
            )
    
    # 사원 번호 변경 시 중복 확인
    if user_update.emp_number is not None and user_update.emp_number != current_user.emp_number:
        existing_user_by_emp_number = user_service.get_user_by_emp_number(db, user_update.emp_number)
        if existing_user_by_emp_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New employee number is already registered",
            )

    # 서비스 계층을 통해 사용자 정보 업데이트
    updated_user = user_service.update_user(db, current_user, user_update)
    return UserResponse.model_validate(updated_user)

# ▼▼▼ [핵심] "나의 실시간 공격 현황"을 조회하는 새로운 API ▼▼▼
@router.get("/me/attacks", summary="현재 사용자의 최근 공격 현황 조회")
def get_my_recent_attacks(current_user: Annotated[User, Depends(get_current_user)]):
    """
    현재 로그인한 사용자와 관련된 최근 공격 데이터를 Elasticsearch에서 조회합니다.
    `user_id`를 기반으로 `attack_detections`, `winlogbeat-raw`, `packetbeat-raw` 인덱스를 검색합니다.
    """
    user_id = current_user.user_id

    # Elasticsearch에서 해당 user_id로 필터링하는 쿼리
    query = {
        "query": {
            "match": {
                "user_id": user_id  # text 필드이므로 match 쿼리 사용
            }
        },
        "sort": [
            { "timestamp": { "order": "desc" } } # attack_detections는 timestamp 사용
        ],
        "size": 50 # 최근 50개까지 조회
    }

    try:
        # attack_detections, winlogbeat-raw, packetbeat-raw 세 인덱스를 모두 검색
        response = es_client.search(
            index="attack_detections,winlogbeat-raw,packetbeat-raw", 
            body=query
        )
        return response['hits']['hits']
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data from Elasticsearch: {e}")

# ----------------------------------------------------
# (선택 사항) 특정 user_id를 가진 사용자 조회 (어드민용 등)
# ----------------------------------------------------
# @router.get("/{user_id}", response_model=UserResponse, summary="특정 사용자 정보 조회 (어드민용)")
# async def read_user_by_id(
#     user_id: str,
#     db: Annotated[Session, Depends(get_db)],
#     current_user: Annotated[User, Depends(get_current_user)] # 어드민 권한 체크 로직 추가 필요
# ):
#     """
#     특정 user_id를 가진 사용자의 정보를 조회합니다.
#     이 엔드포인트는 일반적으로 관리자 권한이 있는 사용자만 접근하도록 제한해야 합니다.
#     """
#     # 실제 사용 시, 이 엔드포인트는 어드민 권한이 있는 사용자만 접근하도록 제한해야 합니다.
#     # 예: if not current_user.is_admin: raise HTTPException(status_code=403, detail="Forbidden")
#     user = user_service.get_user_by_user_id(db, user_id)
#     if not user:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
#     return UserResponse.model_validate(user)