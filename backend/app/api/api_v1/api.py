from fastapi import APIRouter
from app.api.api_v1.endpoints import (
    orders,
    products,
    countries,
    categories,
    suppliers,
    ships,
    companies,
    ports,
    email_templates,
    order_utils,
    auth,
    users,
    order_processing,
)

api_router = APIRouter()

# 注册路由
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(order_utils.router, tags=["order-utils"])  # 不添加前缀，直接注册到根路径
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(countries.router, prefix="/countries", tags=["countries"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(ships.router, prefix="/ships", tags=["ships"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(ports.router, prefix="/ports", tags=["ports"])
api_router.include_router(email_templates.router, prefix="/email-templates", tags=["email-templates"]) 
api_router.include_router(order_processing.router, prefix="/order-processing", tags=["order-processing"]) 