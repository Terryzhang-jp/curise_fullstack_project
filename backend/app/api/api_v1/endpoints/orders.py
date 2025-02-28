from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, cast, Float
from pydantic import BaseModel
import os
import shutil
import logging
from datetime import datetime
import csv
import tempfile
from decimal import Decimal

from app import crud
from app.api import deps
from app.crud.crud_order_analysis import order_analysis
from app.crud.crud_order_upload import order_upload
from app.crud.crud_order import order as crud_order
from app.schemas.order_analysis import OrderAnalysis, OrderAnalysisItem
from app.schemas.order_upload import OrderUpload
from app.schemas.order import Order, OrderCreate, OrderItemBase, OrderItem
from app.utils.excel import create_order_items_excel
from app.models.models import OrderItem as OrderItemModel, Order as OrderModel, Product as ProductModel, NotificationHistory, Supplier
from app.utils.email import send_email_with_attachments

class PendingOrderResponse(BaseModel):
    id: int
    order_id: int
    order_no: str
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

class OrderItemStatusUpdate(BaseModel):
    status: str

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/statistics")
def get_order_statistics(
    db: Session = Depends(deps.get_db),
):
    """获取订单统计信息"""
    try:
        # 获取所有订单的状态统计
        orders = db.query(OrderModel).all()
        total_orders = len(orders)
        not_started_orders = sum(1 for o in orders if o.status == "not_started")
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

@router.get("/", response_model=List[Order])
def get_orders(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    include_relations: bool = False
):
    """获取订单列表"""
    try:
        logger.info(f"正在获取订单列表: skip={skip}, limit={limit}, status={status}, include_relations={include_relations}")
        orders = crud_order.get_multi(db, skip=skip, limit=limit, status=status, include_relations=include_relations)
        logger.info(f"成功获取 {len(orders)} 个订单")
        return orders
    except Exception as e:
        logger.error(f"获取订单列表失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取订单列表失败: {str(e)}"
        )

@router.get("/{order_id}", response_model=Order)
def get_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int
):
    """获取订单详情"""
    try:
        logger.info(f"正在获取订单详情: order_id={order_id}")
        order = crud_order.get_with_items(db, id=order_id)
        if not order:
            logger.warning(f"未找到订单: order_id={order_id}")
            raise HTTPException(
                status_code=404,
                detail="订单不存在"
            )
        
        # 添加详细的订单项目信息日志
        logger.info(f"订单状态: {order.status}, 总金额: {order.total_amount}, 订单项目数量: {len(order.order_items) if order.order_items else 0}")
        if order.order_items:
            for idx, item in enumerate(order.order_items):
                logger.info(f"订单项目 #{idx+1}: ID={item.id}, 产品ID={item.product_id}, 状态={item.status}, 数量={item.quantity}, 价格={item.price}")
        else:
            logger.warning(f"订单 {order_id} 没有关联的订单项目")
            
        # 检查前端请求头信息
        logger.info("请求获取订单详情的前端信息已记录")
        
        logger.info("成功获取订单详情")
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取订单详情失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取订单详情失败: {str(e)}"
        )

@router.delete("/{order_id}")
def delete_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int
):
    """删除订单"""
    try:
        logger.info(f"正在删除订单: order_id={order_id}")
        order = crud_order.get(db, id=order_id)
        if not order:
            logger.warning(f"未找到订单: order_id={order_id}")
            raise HTTPException(
                status_code=404,
                detail="订单不存在"
            )
        crud_order.remove(db, id=order_id)
        logger.info("成功删除订单")
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除订单失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"删除订单失败: {str(e)}"
        )

@router.post("/confirm/{order_id}")
def confirm_order(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int
):
    """确认上传的订单"""
    try:
        order = order_upload.confirm_order(db, order_id=order_id)
        if not order:
            raise HTTPException(
                status_code=404,
                detail="找不到指定的订单"
            )
        return {"status": "success", "order_id": order.id}
    except Exception as e:
        print(f"API确认订单失败: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"确认订单失败: {str(e)}"
        )

@router.post("/upload", response_model=OrderUpload)
async def upload_order(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    country_id: int = Form(...),
    ship_id: int = Form(...)
):
    """上传订单文件并解析"""
    try:
        # 确保上传目录存在
        os.makedirs("uploads", exist_ok=True)
        
        # 保存文件
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # 创建订单记录
        result = order_upload.create_from_upload(
            db,
            file_path=file_path,
            file_name=file.filename,
            country_id=country_id,
            ship_id=ship_id
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        # 清理临时文件
        if os.path.exists(file_path):
            os.remove(file_path)

@router.get("/upload/{upload_id}", response_model=OrderUpload)
def get_upload_record(
    *,
    db: Session = Depends(deps.get_db),
    upload_id: int
):
    """获取上传记录详情"""
    record = order_upload.get_with_details(db, id=upload_id)
    if not record:
        raise HTTPException(status_code=404, detail="上传记录不存在")
    return record

@router.get("/analyses/{analysis_id}/items", response_model=List[OrderAnalysisItem])
def get_analysis_items(
    analysis_id: int,
    category_id: Optional[int] = None,
    db: Session = Depends(deps.get_db)
):
    """获取订单分析项目"""
    items = order_analysis.get_items(
        db,
        analysis_id=analysis_id,
        category_id=category_id
    )
    return items

@router.get("/list/pending", response_model=List[PendingOrderResponse])
def get_pending_orders(
    db: Session = Depends(deps.get_db),
):
    """
    获取所有待处理订单项目
    """
    try:
        logger.info("开始查询待处理订单项目")
        
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
        logger.info(f"查询到 {len(items)} 个待处理订单项目")
        
        # 转换为响应格式
        result = []
        for item in items:
            try:
                result.append(PendingOrderResponse(
                    id=item.id,
                    order_id=item.order_id,
                    order_no=item.order.order_no if item.order else "",
                    ship_name=item.order.ship.name if item.order and item.order.ship else None,
                    product_name=item.product.name if item.product else None,
                    product_code=item.product.code if item.product else None,
                    supplier_name=item.supplier.name if item.supplier else None,
                    quantity=float(item.quantity) if item.quantity else 0.0,
                    price=float(item.price) if item.price else 0.0,
                    total=float(item.total) if item.total else 0.0,
                    status=item.status
                ))
            except Exception as e:
                logger.error(f"处理订单项目时出错: {str(e)}, 项目ID: {item.id}")
                continue
        
        logger.info(f"成功构建响应数据，返回 {len(result)} 个有效订单项目")
        return result
        
    except Exception as e:
        logger.error(f"获取待处理订单项目失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取待处理订单项目失败: {str(e)}"
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

@router.post("/items/{item_id}/remove")
def remove_pending_order(
    item_id: int,
    db: Session = Depends(deps.get_db),
):
    """
    移除待处理订单项目
    """
    try:
        item = db.query(OrderItemModel).filter(
            OrderItemModel.id == item_id,
            OrderItemModel.status == 'pending'
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="待处理订单项目不存在")
            
        # 删除订单项目
        db.delete(item)
        db.commit()
        
        return {"message": "订单项目已移除"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/items/remove/all")
def remove_all_pending_orders(
    db: Session = Depends(deps.get_db),
):
    """
    移除所有待处理订单项目
    """
    try:
        # 查询所有待处理订单项目
        items = db.query(OrderItemModel).filter(
            OrderItemModel.status == 'pending'
        ).all()
        
        if not items:
            return {"message": "没有待处理的订单项目"}
            
        # 删除所有待处理订单项目
        count = 0
        for item in items:
            db.delete(item)
            count += 1
            
        db.commit()
        
        return {"message": f"成功移除 {count} 个待处理订单项目"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"移除所有待处理订单项目失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"移除所有待处理订单项目失败: {str(e)}"
        )

@router.post("/send-email")
async def send_order_email(
    supplier_id: int = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    order_item_ids: str = Form(...),  # 接收为字符串，然后解析为列表
    cc_list: str = Form(default=""),  # 接收为逗号分隔的邮箱列表
    bcc_list: str = Form(default=""),  # 接收为逗号分隔的邮箱列表
    additional_attachments: List[UploadFile] = File([]),
    db: Session = Depends(deps.get_db)
):
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

        # 解析抄送和密送列表
        cc_emails = [email.strip() for email in cc_list.split(',') if email.strip()] if cc_list else None
        bcc_emails = [email.strip() for email in bcc_list.split(',') if email.strip()] if bcc_list else None

        # 解析订单项目ID列表
        try:
            order_item_ids_list = [int(id) for id in order_item_ids.split(',')]
        except ValueError:
            raise HTTPException(status_code=400, detail="订单项目ID格式不正确")

        # 获取订单项目信息
        order_items = db.query(OrderItemModel)\
            .filter(OrderItemModel.id.in_(order_item_ids_list))\
            .options(
                joinedload(OrderItemModel.order),
                joinedload(OrderItemModel.product),
            ).all()
        
        if not order_items:
            raise HTTPException(status_code=404, detail="未找到指定的订单项目")

        # 创建Excel文件
        excel_file = create_order_items_excel(order_items)
        
        # 准备所有附件
        attachments = [
            {
                'content': excel_file,
                'filename': f'order_items_{supplier.name}.xlsx',
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
        
        # 发送邮件
        await send_email_with_attachments(
            to_email=supplier.email,
            subject=title,
            body=content,
            attachments=attachments,
            cc_list=cc_emails,
            bcc_list=bcc_emails
        )

        # 记录通知历史
        notification_history = NotificationHistory(
            supplier_id=supplier.id,
            subject=title,
            content=content,
        )
        db.add(notification_history)
        db.commit()

        return {
            "message": "邮件发送成功",
            "details": {
                "to": supplier.email,
                "cc": cc_emails,
                "bcc": bcc_emails,
                "attachments_count": len(attachments)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"发送邮件失败: {str(e)}")

@router.post("/", response_model=Order)
def create_order(
    *,
    db: Session = Depends(deps.get_db),
    order_in: OrderCreate
):
    """创建新订单"""
    try:
        logger.info(f"开始创建新订单: {order_in.order_no}")
        order = crud_order.create_with_items(db, obj_in=order_in)
        logger.info(f"订单创建成功: id={order.id}, order_no={order.order_no}")
        return order
    except Exception as e:
        logger.error(f"创建订单失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"创建订单失败: {str(e)}"
        )

@router.put("/{order_id}/status")
def update_order_status(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    status_update: OrderStatusUpdate
):
    """更新订单状态"""
    try:
        logger.info(f"正在更新订单状态: order_id={order_id}, 新状态={status_update.status}")
        order = crud_order.get(db, id=order_id)
        if not order:
            logger.warning(f"未找到订单: order_id={order_id}")
            raise HTTPException(
                status_code=404,
                detail="订单不存在"
            )
        
        # 更新订单状态
        order_in = {"status": status_update.status}
        updated_order = crud_order.update(db, db_obj=order, obj_in=order_in)
        
        logger.info(f"成功更新订单状态: order_id={order_id}, 新状态={updated_order.status}")
        return {"message": "更新成功", "order_id": order_id, "status": updated_order.status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新订单状态失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"更新订单状态失败: {str(e)}"
        )

@router.put("/{order_id}/items/status")
def update_order_items_status(
    *,
    db: Session = Depends(deps.get_db),
    order_id: int,
    status_update: OrderItemStatusUpdate
):
    """批量更新订单项状态"""
    try:
        logger.info(f"尝试批量更新订单项状态: order_id={order_id}, new_status={status_update.status}")
        
        order = crud_order.get_with_items(db, id=order_id)
        if not order:
            logger.warning(f"未找到订单: order_id={order_id}")
            raise HTTPException(status_code=404, detail="订单不存在")
        
        updated_count = 0
        if order.order_items:
            for item in order.order_items:
                try:
                    item.status = status_update.status
                    updated_count += 1
                    logger.info(f"已更新订单项状态: item_id={item.id}, new_status={status_update.status}")
                except Exception as e:
                    logger.error(f"更新订单项状态失败: item_id={item.id}, error={str(e)}")
            
            db.commit()
            
            # 根据订单项状态更新订单状态
            if all(item.status == "processed" for item in order.order_items):
                order.status = "fully_processed"
            elif any(item.status == "processed" for item in order.order_items):
                order.status = "partially_processed"
            else:
                order.status = "not_started"
            
            db.commit()
            logger.info(f"订单状态已更新: order_id={order_id}, new_status={order.status}")
            
        return {
            "message": "更新成功",
            "order_id": order_id,
            "updated_items_count": updated_count,
            "order_status": order.status if updated_count > 0 else "无更改"
        }
    except Exception as e:
        logger.error(f"更新订单项状态发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"更新订单项状态失败: {str(e)}")

@router.post("/items", response_model=OrderItem)
def create_order_item(
    *,
    db: Session = Depends(deps.get_db),
    item_data: OrderItemBase
):
    """创建新的订单项目"""
    try:
        logger.info(f"尝试创建新的订单项目: order_id={item_data.order_id}, product_id={item_data.product_id}")
        
        # 检查订单是否存在
        order = crud_order.get(db, id=item_data.order_id)
        if not order:
            logger.warning(f"未找到订单: order_id={item_data.order_id}")
            raise HTTPException(status_code=404, detail="订单不存在")
        
        # 检查产品是否存在
        product = db.query(ProductModel).get(item_data.product_id)
        if not product:
            logger.warning(f"未找到产品: product_id={item_data.product_id}")
            raise HTTPException(status_code=404, detail="产品不存在")
        
        # 检查供应商是否存在
        supplier = db.query(Supplier).get(item_data.supplier_id)
        if not supplier:
            logger.warning(f"未找到供应商: supplier_id={item_data.supplier_id}")
            raise HTTPException(status_code=404, detail="供应商不存在")
        
        # 创建新的订单项目
        new_item = OrderItemModel(
            order_id=item_data.order_id,
            product_id=item_data.product_id,
            supplier_id=item_data.supplier_id,
            quantity=item_data.quantity,
            price=item_data.price,
            total=item_data.total,
            status=item_data.status
        )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        # 更新订单总金额 - 修复类型不匹配问题
        order.total_amount = float(Decimal(str(order.total_amount)) + Decimal(str(new_item.total)))
        db.commit()
        
        logger.info(f"成功创建订单项目: id={new_item.id}")
        
        return new_item
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"创建订单项目失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建订单项目失败: {str(e)}")
