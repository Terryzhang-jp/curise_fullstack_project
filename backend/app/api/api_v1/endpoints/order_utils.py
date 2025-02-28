from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func

from app import crud
from app.api import deps
from app.models.models import OrderItem as OrderItemModel, Order as OrderModel, Product as ProductModel

router = APIRouter()

@router.get("/statistics")
def get_order_statistics(
    db: Session = Depends(deps.get_db),
):
    """获取订单统计信息"""
    try:
        # 获取所有订单的状态统计
        orders = db.query(OrderModel).all()
        total_orders = len(orders)
        not_started_orders = sum(1 for o in orders if o.status == "not_started" or o.status == "pending")
        partially_processed_orders = sum(1 for o in orders if o.status == "partially_processed")
        fully_processed_orders = sum(1 for o in orders if o.status == "fully_processed")

        # 获取所有订单项的状态统计
        order_items = db.query(OrderItemModel).all()
        total_items = len(order_items)
        processed_items = sum(1 for i in order_items if i.status == "processed")
        unprocessed_items = sum(1 for i in order_items if i.status == "unprocessed")

        return {
            "total_orders": total_orders,
            "not_started_orders": not_started_orders,
            "partially_processed_orders": partially_processed_orders,
            "fully_processed_orders": fully_processed_orders,
            "total_items": total_items,
            "processed_items": processed_items,
            "unprocessed_items": unprocessed_items
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

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