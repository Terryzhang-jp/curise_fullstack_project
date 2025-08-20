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
    # order_processing,
    health,
    dashboard,
    cruise_orders,
    product_suppliers,

    system_status,
    file_upload,
    products_upload,
    email_settings,
)

api_router = APIRouter()

# 注册路由
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(order_utils.router, prefix="/order-utils", tags=["order-utils"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(countries.router, prefix="/countries", tags=["countries"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(ships.router, prefix="/ships", tags=["ships"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(ports.router, prefix="/ports", tags=["ports"])
api_router.include_router(email_templates.router, prefix="/email-templates", tags=["email-templates"]) 
# api_router.include_router(order_processing.router, prefix="/order-processing", tags=["order-processing"])
api_router.include_router(cruise_orders.router, prefix="/cruise-orders", tags=["cruise-orders"])
api_router.include_router(product_suppliers.router, prefix="/product-suppliers", tags=["product-suppliers"])

api_router.include_router(system_status.router, prefix="/system", tags=["system-status"])
api_router.include_router(file_upload.router, prefix="/file-upload", tags=["file-upload"])
api_router.include_router(products_upload.router, prefix="/file-upload", tags=["products-upload"])
api_router.include_router(email_settings.router, prefix="/email-settings", tags=["email-settings"])