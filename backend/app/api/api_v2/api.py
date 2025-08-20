"""
API v2 路由配置
专注于新的产品上传功能和Excel生成
"""

from fastapi import APIRouter
from app.api.api_v2.endpoints import product_upload, excel_generator

api_router = APIRouter()

# 注册产品上传路由
api_router.include_router(
    product_upload.router,
    prefix="/products",
    tags=["products-v2"]
)

# 注册Excel生成路由
api_router.include_router(
    excel_generator.router,
    prefix="/excel",
    tags=["excel-v2"]
)
