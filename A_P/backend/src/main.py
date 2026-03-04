from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, Response # Response 임포트 추가
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from .core.database import Base, engine 
from .routes import auth, analysis, users, attacks

app = FastAPI(title="FastAPI User Authentication API")

# CORS Middleware configuration
# 🚨 수정된 부분: 허용할 오리진 목록에 'http://localhost:5173' 명확히 포함
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173", # 프론트엔드 개발 서버 주소 추가
    "http://127.0.0.1:5173", # 127.0.0.1도 포함 (혹시 모를 경우)
    # Add your frontend production URL here if deployed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)


# 라우터 등록
app.include_router(auth.router)
app.include_router(attacks.router)
app.include_router(analysis.router)
app.include_router(users.router)

# 추가된 부분: OPTIONS 메서드에 대한 전역 핸들러
# Preflight 요청에 대해 200 OK 응답을 보내도록 강제합니다.
@app.options("/{path:path}")
async def options_handler(request: Request, path: str):
    # CORS 미들웨어가 이미 헤더를 처리하므로, 여기서는 단순히 빈 200 응답을 반환합니다.
    # 이렇게 하면 브라우저의 Preflight 요청이 성공적으로 완료됩니다.
    return Response(status_code=status.HTTP_200_OK)


# 전역 예외 핸들러: 유효성 검사 오류
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

# 전역 예외 핸들러: 데이터베이스 무결성 오류 (예: UNIQUE 제약 조건 위반)
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT, 
        content={"detail": "Database integrity error. This might be due to duplicate entry or constraint violation."},
    )

# 루트 엔드포인트 (선택 사항)
@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI User Authentication API!"}