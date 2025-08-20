from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import json
import logging
from pathlib import Path
import pandas as pd
from datetime import datetime

from app import crud
from app.api import deps
from app.schemas.supplier import SupplierCreate, SupplierUpdate, Supplier
from app.utils.email import send_email_with_attachments
from app.utils.excel import create_order_items_excel
from app.models.models import OrderItem as models
from app.utils.gmail_sender import create_gmail_sender
from app.api.api_v2.endpoints.excel_generator import create_purchase_order_excel, PurchaseOrderRequest, ProductItem
# NotificationHistory model has been removed

logger = logging.getLogger(__name__)

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

        # 添加BOX标签文件作为第二个附件
        try:
            import os
            box_label_path = os.path.join(os.path.dirname(__file__), '../../../../ BOXラベル&Palletラベル(A4横).xlsx')
            if os.path.exists(box_label_path):
                with open(box_label_path, 'rb') as f:
                    box_label_content = f.read()
                attachments.append({
                    'content': box_label_content,
                    'filename': 'BOXラベル&Palletラベル(A4横).xlsx',
                    'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                })
                logger.info("已添加BOX标签文件作为附件")
            else:
                logger.warning(f"BOX标签文件不存在: {box_label_path}")
        except Exception as e:
            logger.error(f"添加BOX标签文件失败: {str(e)}")
            # 不影响主流程，继续发送邮件

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

        # NotificationHistory 功能已移除 - 以下代码已禁用
        # notification_history = NotificationHistory(
        #     supplier_id=supplier.id,
        #     subject=title,
        #     content=content,
        # )
        # db.add(notification_history)
        db.commit()

        return {"message": "邮件发送任务已添加到队列"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"发送邮件失败: {str(e)}")


@router.post("/send-inquiry-email")
async def send_inquiry_email(
    *,
    db: Session = Depends(deps.get_db),
    background_tasks: BackgroundTasks,
    supplier_id: int = Form(...),
    subject: str = Form(...),
    content: str = Form(...),
    products_data: Optional[str] = Form(None),
    additional_attachments: List[UploadFile] = File([]),
) -> Any:
    """
    向供应商发送询价邮件
    """
    try:
        # 获取供应商信息
        supplier = crud.supplier.get(db, id=supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="供应商不存在")

        if not supplier.email:
            raise HTTPException(status_code=400, detail="供应商邮箱未设置")

        logger.info(f"开始发送询价邮件给供应商: {supplier.name} ({supplier.email})")

        # 准备附件列表
        attachments = []

        # 1. 生成询价单Excel附件
        if products_data:
            try:
                # 解析产品数据
                products_json = json.loads(products_data)
                logger.info(f"解析到 {len(products_json)} 个产品")

                # 转换为Excel生成器需要的格式
                products = []
                total_amount = 0
                current_date = datetime.now().strftime('%Y%m%d')
                po_number = f"{current_date}ML"

                for product_data in products_json:
                    product_item = ProductItem(
                        po_number=po_number,
                        product_code=product_data.get('product_code', ''),
                        product_name_en=product_data.get('product_name_en', ''),
                        product_name_jp=product_data.get('product_name_jp', ''),
                        pack_size=product_data.get('pack_size', ''),
                        quantity=int(product_data.get('quantity', 0)),
                        unit=product_data.get('unit', 'PC'),
                        unit_price=float(product_data.get('unit_price', 0)),
                        amount=float(product_data.get('amount', 0)),
                        currency=product_data.get('currency', 'JPY')
                    )
                    products.append(product_item)
                    total_amount += product_item.amount

                # 创建采购订单请求
                purchase_request = PurchaseOrderRequest(
                    supplier_id=supplier.id,
                    supplier_name=supplier.name,
                    products=products,
                    delivery_date=datetime.now().strftime('%Y-%m-%d'),
                    delivery_address='神奈川県横浜市中区海岸通り1-1-4',
                    total_amount=total_amount,
                    currency='JPY',
                    invoice_number=f"{current_date}-01 ML",
                    voyage_number='ML-1017'
                )

                # 调用Excel生成器生成询价单
                excel_content = create_purchase_order_excel(purchase_request, supplier, db)

                attachments.append({
                    'content': excel_content,
                    'filename': f'询价单_{supplier.name}_{current_date}.xlsx',
                    'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                })
                logger.info("已生成询价单Excel附件")

            except json.JSONDecodeError as e:
                logger.error(f"产品数据JSON解析失败: {str(e)}")
                raise HTTPException(status_code=400, detail="产品数据格式错误")
            except Exception as e:
                logger.error(f"生成询价单Excel失败: {str(e)}")
                # 不阻断流程，继续发送邮件

        # 2. 添加BOX标签模板附件
        try:
            # 计算BOX标签文件路径 - 从suppliers.py往上5级到backend目录
            box_label_path = Path(__file__).parent.parent.parent.parent.parent / " BOXラベル&Palletラベル(A4横).xlsx"

            if box_label_path.exists():
                with open(box_label_path, 'rb') as f:
                    box_label_content = f.read()
                attachments.append({
                    'content': box_label_content,
                    'filename': 'BOXラベル&Palletラベル(A4横).xlsx',
                    'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                })
                logger.info("已添加BOX标签模板附件")
            else:
                logger.warning(f"BOX标签文件不存在: {box_label_path}")
        except Exception as e:
            logger.error(f"添加BOX标签文件失败: {str(e)}")

        # 3. 添加用户自定义附件
        if additional_attachments:
            for attachment in additional_attachments:
                if attachment.filename:  # 确保文件名不为空
                    content = await attachment.read()
                    attachments.append({
                        'content': content,
                        'filename': attachment.filename,
                        'content_type': attachment.content_type or 'application/octet-stream'
                    })
                    logger.info(f"已添加用户附件: {attachment.filename}")

        logger.info(f"总共准备了 {len(attachments)} 个附件")

        # 使用真正的Gmail发送器发送邮件
        try:
            gmail_sender = create_gmail_sender(db)
            if gmail_sender:
                success, error = gmail_sender.send_email(
                    to_emails=[supplier.email],
                    subject=subject,
                    body=content,
                    attachments=attachments,
                    is_html=False
                )

                if success:
                    logger.info(f"Gmail发送成功: {supplier.email}")
                    return {
                        "message": "询价邮件发送成功",
                        "supplier_name": supplier.name,
                        "supplier_email": supplier.email,
                        "attachments_count": len(attachments)
                    }
                else:
                    logger.error(f"Gmail发送失败: {error}")
                    raise HTTPException(status_code=500, detail=f"邮件发送失败: {error}")
            else:
                logger.warning("Gmail发送器初始化失败，使用后台任务发送")
                # 回退到后台任务发送
                background_tasks.add_task(
                    send_email_with_attachments,
                    to_email=supplier.email,
                    subject=subject,
                    body=content,
                    attachments=attachments
                )
                return {
                    "message": "询价邮件发送任务已添加到队列",
                    "supplier_name": supplier.name,
                    "supplier_email": supplier.email,
                    "attachments_count": len(attachments)
                }

        except Exception as e:
            logger.error(f"邮件发送异常: {str(e)}")
            # 回退到后台任务发送
            background_tasks.add_task(
                send_email_with_attachments,
                to_email=supplier.email,
                subject=subject,
                body=content,
                attachments=attachments
            )
            return {
                "message": "询价邮件发送任务已添加到队列（回退模式）",
                "supplier_name": supplier.name,
                "supplier_email": supplier.email,
                "attachments_count": len(attachments)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"发送询价邮件失败: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"发送询价邮件失败: {str(e)}")
