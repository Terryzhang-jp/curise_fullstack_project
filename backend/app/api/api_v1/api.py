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
)

api_router = APIRouter()

# 注册路由
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(countries.router, prefix="/countries", tags=["countries"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(ships.router, prefix="/ships", tags=["ships"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(ports.router, prefix="/ports", tags=["ports"]) 