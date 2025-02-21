from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from pydantic import BaseModel

from app import crud
from app.api import deps
from app.models.models import OrderItem as OrderItemModel, Order as OrderModel, Product as ProductModel
from app.schemas.order import OrderItem, Order

class PendingOrderResponse(BaseModel):
    id: int
    order_id: int
    order_no: str | None = None
    ship_name: str | None = None
    product_name: str | None = None
    product_code: str | None = None
    supplier_name: str | None = None
    quantity: float
    price: float
    total: float
    status: str

class OrderStatusUpdate(BaseModel):
    status: str

class SupplierMatchRequest(BaseModel):
    order_item_ids: List[int]
    supplier_ids: List[int]

router = APIRouter()

@router.get("/list/pending", response_model=List[PendingOrderResponse])
def get_pending_orders(
    db: Session = Depends(deps.get_db),
):
    """
    获取所有待处理订单
    """
    try:
        # 使用 join 来获取更多信息
        query = (
            db.query(OrderItemModel)
            .join(OrderModel)
            .options(
                joinedload(OrderItemModel.order),
                joinedload(OrderItemModel.product),
                joinedload(OrderItemModel.supplier),
                joinedload(OrderItemModel.order).joinedload(OrderModel.ship)
            )
            .filter(OrderItemModel.status == 'pending')
            .order_by(OrderModel.order_no)
        )
        
        items = query.all()
        
        # 转换为响应格式
        result = []
        for item in items:
            try:
                result.append(PendingOrderResponse(
                    id=item.id,
                    order_id=item.order_id,
                    order_no=item.order.order_no if item.order else None,
                    ship_name=item.order.ship.name if item.order and item.order.ship else None,
                    product_name=item.product.name if item.product else None,
                    product_code=item.product.code if item.product else None,
                    supplier_name=item.supplier.name if item.supplier else None,
                    quantity=float(item.quantity),
                    price=float(item.price),
                    total=float(item.total),
                    status=item.status
                ))
            except Exception as e:
                print(f"处理订单项目时出错: {str(e)}, 项目ID: {item.id}")
                continue
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/items/{item_id}/process")
def process_order(
    item_id: int,
    db: Session = Depends(deps.get_db),
):
    """
    处理指定订单项目
    """
    try:
        item = db.query(OrderItemModel).filter(OrderItemModel.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="订单项目不存在")
            
        # 更新订单状态
        item.status = "processing"
        db.add(item)
        db.commit()
        
        return {"message": "订单项目已开始处理"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.put("/items/{item_id}/status")
def update_order_status(
    item_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(deps.get_db),
):
    """
    更新订单项目状态
    """
    try:
        # 验证状态值
        valid_statuses = ['pending', 'processing', 'assigned', 'completed', 'failed']
        if status_update.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"无效的状态值。有效值为: {', '.join(valid_statuses)}"
            )
        
        # 查找订单项目
        item = db.query(OrderItemModel).filter(OrderItemModel.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="订单项目不存在")
        
        # 更新状态
        item.status = status_update.status
        db.add(item)
        db.commit()
        
        return {"message": "状态更新成功", "status": status_update.status}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/items/match-suppliers")
def match_suppliers(
    match_request: SupplierMatchRequest,
    db: Session = Depends(deps.get_db),
):
    """
    为订单项目匹配供应商，考虑产品类别
    """
    try:
        # 获取所有订单项目
        items = db.query(OrderItemModel).options(
            joinedload(OrderItemModel.product).joinedload(ProductModel.category)
        ).filter(
            OrderItemModel.id.in_(match_request.order_item_ids)
        ).all()
        
        if not items:
            raise HTTPException(status_code=404, detail="未找到指定的订单项目")
            
        # 验证所有订单项目的状态
        for item in items:
            if item.status not in ['pending', 'processing']:
                raise HTTPException(
                    status_code=400,
                    detail=f"订单项目 {item.id} 状态不正确，无法进行供应商匹配"
                )
            
            if not item.product or not item.product.category:
                raise HTTPException(
                    status_code=400,
                    detail=f"订单项目 {item.id} 缺少产品或类别信息"
                )
        
        # 获取所有供应商
        suppliers = db.query(crud.supplier.model).options(
            joinedload(crud.supplier.model.categories)
        ).filter(
            crud.supplier.model.id.in_(match_request.supplier_ids)
        ).all()
        
        if not suppliers:
            raise HTTPException(status_code=404, detail="未找到指定的供应商")
            
        # 验证供应商状态和类别匹配
        for supplier in suppliers:
            if not supplier.status:
                raise HTTPException(
                    status_code=400,
                    detail=f"供应商 {supplier.name} 状态不可用"
                )
                
            # 获取供应商可处理的类别ID列表
            supplier_category_ids = {category.id for category in supplier.categories}
            
            # 检查是否有匹配的订单项目
            matching_items = [
                item for item in items
                if item.product.category.id in supplier_category_ids
            ]
            
            if not matching_items:
                raise HTTPException(
                    status_code=400,
                    detail=f"供应商 {supplier.name} 无法处理指定类别的产品"
                )
        
        # 更新订单项目的状态和供应商信息
        # 这里使用简单的策略：将订单项目分配给第一个可以处理相应类别的供应商
        for item in items:
            category_id = item.product.category.id
            matched_supplier = next(
                (s for s in suppliers if any(c.id == category_id for c in s.categories)),
                None
            )
            
            if matched_supplier:
                item.supplier_id = matched_supplier.id
                item.status = "assigned"
                db.add(item)
            
        db.commit()
        
        return {
            "message": "供应商匹配成功",
            "matched_items": len(items),
            "supplier": suppliers[0].name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        ) 