from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.models.models import Product, Supplier, Order, Ship, Company, Port
from datetime import datetime, timedelta

def get_dashboard_stats(db: Session):
    """获取仪表盘统计数据"""
    # 获取总数统计
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_suppliers = db.query(func.count(Supplier.id)).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_ships = db.query(func.count(Ship.id)).scalar() or 0
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    total_ports = db.query(func.count(Port.id)).scalar() or 0

    # 获取待处理订单数量（状态为 not_started 的订单）
    total_pending_orders = db.query(func.count(Order.id)).filter(
        Order.status == "not_started"
    ).scalar() or 0

    # 获取最近30天的订单数量
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    orders_last_30_days = db.query(func.count(Order.id)).filter(
        Order.created_at >= thirty_days_ago
    ).scalar() or 0

    # 获取活跃的供应商数量（有关联产品的供应商）
    active_suppliers = db.query(func.count(func.distinct(Product.supplier_id))).scalar() or 0

    return {
        "total_products": total_products,
        "total_suppliers": total_suppliers,
        "total_orders": total_orders,
        "total_pending_orders": total_pending_orders,
        "total_ships": total_ships,
        "total_companies": total_companies,
        "total_ports": total_ports,
        "orders_last_30_days": orders_last_30_days,
        "active_suppliers": active_suppliers
    } 