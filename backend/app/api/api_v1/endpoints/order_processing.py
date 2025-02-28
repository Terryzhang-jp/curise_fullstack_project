from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.api import deps
from app.crud.crud_order_processing import order_processing
from app.schemas.order_processing import OrderProcessingItemResponse
from app.models.models import User

router = APIRouter()

@router.get("/items", response_model=List[OrderProcessingItemResponse])
def get_processing_items(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100
):
    """获取当前用户的处理队列项目"""
    items = order_processing.get_by_user(db, current_user.id, skip, limit)
    return items

@router.post("/add-item/{order_item_id}", response_model=OrderProcessingItemResponse)
def add_item_to_processing(
    order_item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """将单个订单项添加到处理队列"""
    item = order_processing.add_from_order_item(db, current_user.id, order_item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"订单项 {order_item_id} 不存在")
    return item

@router.post("/add-items", response_model=List[OrderProcessingItemResponse])
def add_items_to_processing(
    order_item_ids: List[int] = Body(..., embed=False),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """将多个订单项添加到处理队列"""
    if not order_item_ids:
        raise HTTPException(status_code=400, detail="未提供订单项ID")
        
    results = []
    for item_id in order_item_ids:
        item = order_processing.add_from_order_item(db, current_user.id, item_id)
        if item:
            results.append(item)
    
    return results

@router.post("/migrate-from-local", response_model=Dict[str, Any])
def migrate_from_local_storage(
    items: List[Dict[str, Any]] = Body(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """从localStorage迁移数据到数据库"""
    if not items:
        return {"status": "success", "count": 0, "message": "无数据需要迁移"}
        
    results = order_processing.add_from_local_storage(db, current_user.id, items)
    return {
        "status": "success", 
        "count": len(results),
        "message": f"成功迁移 {len(results)} 个项目"
    }

@router.delete("/items/{item_id}", response_model=Dict[str, Any])
def remove_from_processing(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """从处理队列中删除项目"""
    # 先检查项目是否属于当前用户
    item = order_processing.get(db, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="项目不存在或无权删除")
        
    success = order_processing.remove(db, id=item_id)
    return {"status": "success", "message": "项目已从处理队列中删除"}

@router.put("/items/{item_id}/process", response_model=OrderProcessingItemResponse)
def mark_as_processed(
    item_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """将项目标记为已处理"""
    # 先检查项目是否属于当前用户
    item = order_processing.get(db, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="项目不存在或无权操作")
        
    updated_item = order_processing.mark_as_processed(db, id=item_id)
    return updated_item

@router.delete("/clear", response_model=Dict[str, Any])
def clear_all_items(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """清空当前用户的所有处理队列项目"""
    count = order_processing.clear_all_by_user(db, current_user.id)
    return {"status": "success", "count": count, "message": f"已清空 {count} 个项目"} 