from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID # UUID 타입 임포트 (user_id에 사용될 수 있음)

# 회원가입 요청시 클라이언트가 보내는 데이터
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    # front-end에서 camelCase인 'empNumber'로 보내고, back-end에서는 snake_case인 'emp_number'로 사용하고 싶을 때 유용합니다.
    emp_number: str = Field(..., alias="empNumber") 

    class Config:
        # alias로 정의된 필드를 사용할 수 있도록 설정 (populate_by_name)
        populate_by_name = True
        # ORM 모델과의 호환성을 위한 설정
        from_attributes = True

# 로그인 요청시 클라이언트가 보내는 데이터
class UserLogin(BaseModel):
    emp_number: str
    password: str

    class Config:
        from_attributes = True

# JWT 토큰 응답 스키마
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 토큰 데이터 스키마 (JWT 디코딩 후 사용)
class TokenData(BaseModel):
    sub: Optional[str] = None # 'sub' 클레임은 보통 사용자 식별자 (여기서는 emp_number)

# 사용자 정보 응답 스키마
class UserResponse(BaseModel):
    user_id: UUID # User 모델에 user_id (UUID)가 있으므로 스키마에도 포함
    emp_number: str
    email: EmailStr
    name: str
    phone: str
    created_at: datetime
    is_deleted: bool
    # 만약 User 모델에 updated_at 컬럼이 있다면 추가하는 것이 좋습니다.
    # updated_at: datetime
    # 만약 User 모델에 last_password_change 컬럼이 있다면 추가하는 것이 좋습니다.
    # last_password_change: Optional[datetime] = None

    class Config:
        from_attributes = True

# 사용자 정보 업데이트 요청 스키마
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None # 비밀번호 업데이트시 해싱 필요
    phone: Optional[str] = None
    emp_number: Optional[str] = None

    class Config:
        from_attributes = True

# 회원 탈퇴 요청 스키마
class UserDelete(BaseModel):
    password: str

# 🚨 비밀번호 변경 요청 스키마 (새로 추가)
class PasswordChangeRequest(BaseModel):
    current_password: str # 현재 비밀번호
    new_password: str     # 새 비밀번호
    confirm_password: str # 새 비밀번호 확인 (프론트엔드와 백엔드 모두에서 유효성 검사)