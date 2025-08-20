from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
from app.core.config import settings
from app.api.api_v1.api import api_router
from app.api.api_v2.api import api_router as api_v2_router
from app.core.init_app import init_superadmin
from app.db.session import SessionLocal

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cruise System API",
    version=settings.PROJECT_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"请求路径: {request.url.path}")
    response = await call_next(request)
    logger.info(f"响应状态: {response.status_code}")
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"请求验证错误: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc.errors())}
    )

# CORS配置 - 动态配置
allowed_origins = settings.get_allowed_origins
use_wildcard = "*" in allowed_origins

# 添加CORS调试信息
logger = logging.getLogger(__name__)
logger.info(f"🔧 CORS配置:")
logger.info(f"  环境: {settings.ENV}")
logger.info(f"  允许的源: {allowed_origins}")
logger.info(f"  使用通配符: {use_wildcard}")
logger.info(f"  允许凭证: {False if use_wildcard else True}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False if use_wildcard else True,  # 使用通配符时必须设置为False
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"] if use_wildcard else ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["*"] if use_wildcard else ["Content-Type"],
    max_age=3600,
)

# 添加路由检查端点
@app.get("/debug/routes")
async def list_routes():
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": route.methods
        })
    return {"routes": routes}

# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_v2_router, prefix="/api/v2")

@app.get("/")
def read_root():
    return {"message": "Welcome to Cruise System API"}

@app.on_event("startup")
def init_data():
    """
    应用启动时初始化数据
    """
    db = SessionLocal()
    try:
        # 初始化超级管理员账号
        init_superadmin(db)
    finally:
        db.close()