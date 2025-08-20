from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app import crud
from app.api import deps
from app.models.models import OrderItem as OrderItemModel, Order as OrderModel, Product as ProductModel

router = APIRouter()

# 统计端点已移动到 /api/v1/orders/statistics，避免重复

@router.get("/overview")
def get_orders_overview(
    db: Session = Depends(deps.get_db),
):
    """获取订单概览信息，包括每个订单的完成情况"""
    try:
        # 获取所有订单
        orders = db.query(OrderModel).all()
        
        result = []
        for order in orders:
            # 获取每个订单的所有项目
            order_items = db.query(OrderItemModel).filter(OrderItemModel.order_id == order.id).all()
            
            # 计算已处理和未处理项目数量
            total_items = len(order_items)
            processed_items = sum(1 for i in order_items if i.status == "processed")
            
            # 计算订单的完成百分比
            completion_percentage = 0
            if total_items > 0:
                completion_percentage = round((processed_items / total_items) * 100)
            
            # 构建响应数据
            result.append({
                "id": order.id,
                "order_no": order.order_no,
                "order_date": order.order_date,
                "delivery_date": order.delivery_date,
                "status": order.status,
                "total_amount": float(order.total_amount),
                "ship_name": order.ship.name if order.ship else None,
                "company_name": order.company.name if order.company else None,
                "port_name": order.port.name if order.port else None,
                "total_items": total_items,
                "processed_items": processed_items,
                "completion_percentage": completion_percentage,
            })
            
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        ) 