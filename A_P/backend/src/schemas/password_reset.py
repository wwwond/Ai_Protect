# src/schemas/password_reset.py

from pydantic import BaseModel, EmailStr
from typing import Optional

# 1. 비밀번호 재설정 요청 (forgot_password)
class ForgotPasswordRequest(BaseModel):
    email: EmailStr # 재설정할 사용자의 이메일

# 2. 비밀번호 재설정 완료 (reset_password)
class ResetPasswordRequest(BaseModel):
    token: str      # 이메일로 받은 재설정 토큰
    new_password: str # 새롭게 설정할 비밀번호

# 3. 비밀번호 재설정 요청 성공 응답 (선택 사항, 간단한 메시지)
class PasswordResetResponse(BaseModel):
    message: str
    detail: Optional[str] = None