from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
import json

from app import crud
from app.api import deps
from app.schemas.supplier import SupplierCreate, SupplierUpdate, Supplier
from app.utils.email import send_email_with_attachments
from app.utils.excel import create_order_items_excel
from app.models.models import NotificationHistory, OrderItem as models

router = APIRouter()

class CategoryUpdate(BaseModel):
    category_ids: List[int]

class OrderNotificationRequest(BaseModel):
    supplier_id: int
    title: str
    content: str
    order_item_ids: List[int]

@router.get("/", response_model=List[Supplier])
def read_suppliers(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取供应商列表
    """
    suppliers = crud.supplier.get_multi_with_categories(db, skip=skip, limit=limit)
    print("供应商列表:", [
        {
            "id": s.id, 
            "name": s.name, 
            "country": s.country.name if s.country else None,
            "categories": [{"id": c.id, "name": c.name} for c in s.categories]
        } 
        for s in suppliers
    ])
    return suppliers

@router.post("/", response_model=Supplier)
def create_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_in: SupplierCreate,
) -> Any:
    """
    创建新供应商
    """
    supplier = crud.supplier.create(db, obj_in=supplier_in)
    return supplier

@router.put("/{supplier_id}", response_model=Supplier)
def update_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
    supplier_in: SupplierUpdate,
) -> Any:
    """
    更新供应商
    """
    supplier = crud.supplier.get(db, id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier = crud.supplier.update(db, db_obj=supplier, obj_in=supplier_in)
    return supplier

@router.get("/{supplier_id}", response_model=Supplier)
def read_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
) -> Any:
    """
    通过ID获取供应商
    """
    supplier = crud.supplier.get(db, id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.delete("/{supplier_id}")
def delete_supplier(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
) -> Any:
    """
    删除供应商
    """
    supplier = crud.supplier.get(db, id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    supplier = crud.supplier.remove(db, id=supplier_id)
    return {"ok": True}

@router.put("/{supplier_id}/categories", response_model=Supplier)
def update_supplier_categories(
    *,
    db: Session = Depends(deps.get_db),
    supplier_id: int,
    category_update: CategoryUpdate,
) -> Any:
    """
    更新供应商的类别关联
    """
    supplier = crud.supplier.get(db, id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="供应商不存在")
    
    try:
        supplier = crud.supplier.update_categories(
            db, 
            supplier_id=supplier_id, 
            category_ids=category_update.category_ids
        )
        return supplier
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新类别失败: {str(e)}")

@router.post("/send-order-notification")
async def send_order_notification(
    *,
    db: Session = Depends(deps.get_db),
    background_tasks: BackgroundTasks,
    supplier_id: int = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    order_item_ids: str = Form(...),
    additional_attachments: List[UploadFile] = File(None),
) -> Any:
    """
    向供应商发送订单通知邮件
    """
    try:
        # 获取供应商信息
        supplier = crud.supplier.get(db, id=supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="供应商不存在")
        
        if not supplier.email:
            raise HTTPException(status_code=400, detail="供应商邮箱未设置")

        # 解析订单项目ID列表
        order_item_ids_list = json.loads(order_item_ids)

        # 获取订单项目信息
        order_items = db.query(models.OrderItem)\
            .filter(models.OrderItem.id.in_(order_item_ids_list))\
            .options(
                joinedload(models.OrderItem.order),
                joinedload(models.OrderItem.product),
            ).all()
        
        if not order_items:
            raise HTTPException(status_code=404, detail="未找到指定的订单项目")

        # 创建Excel文件
        excel_file = create_order_items_excel(order_items)
        
        # 准备所有附件
        attachments = [
            {
                'content': excel_file,
                'filename': 'order_items.xlsx',
                'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        ]

        # 添加额外的附件
        if additional_attachments:
            for attachment in additional_attachments:
                content = await attachment.read()
                attachments.append({
                    'content': content,
                    'filename': attachment.filename,
                    'content_type': attachment.content_type
                })
        
        # 在后台发送邮件
        background_tasks.add_task(
            send_email_with_attachments,
            to_email=supplier.email,
            subject=title,
            body=content,
            attachments=attachments
        )

        # 记录通知历史
        notification_history = NotificationHistory(
            supplier_id=supplier.id,
            subject=title,
            content=content,
        )
        db.add(notification_history)
        db.commit()

        return {"message": "邮件发送任务已添加到队列"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"发送邮件失败: {str(e)}")
