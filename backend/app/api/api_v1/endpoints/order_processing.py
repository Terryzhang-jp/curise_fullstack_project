"""
订单处理相关API端点
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime
import shutil

from app.api import deps
from app.core.config import settings
from app.models.models import User, Order, OrderItem
# from app.services.order_parser import OrderExcelParser
# from app.services.product_matcher import ProductMatcher

router = APIRouter()

# 确保上传目录存在
UPLOAD_DIR = "uploads/orders"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-order-file")
async def upload_order_file(
    file: UploadFile = File(...),
    country_id: int = Form(...),
    ship_id: int = Form(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    上传订单Excel文件
    """
    try:
        # 验证文件类型
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="只支持Excel文件格式 (.xlsx, .xls)")

        # 生成唯一文件名
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        # 创建文件上传记录
        file_upload = OrderFileUpload(
            file_name=unique_filename,
            original_file_name=file.filename,
            file_path=file_path,
            file_size=file_size,
            country_id=country_id,
            ship_id=ship_id,
            uploaded_by=current_user.id,
            upload_status="uploaded",
            processing_status="pending"
        )

        db.add(file_upload)
        db.commit()
        db.refresh(file_upload)

        return {
            "success": True,
            "message": "文件上传成功",
            "file_upload_id": file_upload.id,
            "file_name": file.filename,
            "file_size": file_size
        }

    except Exception as e:
        # 清理文件
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@router.post("/parse-order-file/{file_upload_id}")
async def parse_order_file(
    file_upload_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    解析上传的订单文件
    """
    try:
        # 获取文件上传记录
        file_upload = db.query(OrderFileUpload).filter(
            OrderFileUpload.id == file_upload_id,
            OrderFileUpload.uploaded_by == current_user.id
        ).first()

        if not file_upload:
            raise HTTPException(status_code=404, detail="文件记录不存在")

        if not os.path.exists(file_upload.file_path):
            raise HTTPException(status_code=404, detail="文件不存在")

        # 更新处理状态
        file_upload.processing_status = "analyzing"
        db.commit()

        # 解析Excel文件
        parser = OrderExcelParser()
        parse_result = parser.parse_excel_file(file_upload.file_path)

        if not parse_result["success"]:
            file_upload.processing_status = "failed"
            file_upload.error_message = parse_result.get("error", "解析失败")
            db.commit()
            raise HTTPException(status_code=400, detail=f"文件解析失败: {parse_result.get('error')}")

        # 保存解析结果到数据库
        product_matcher = ProductMatcher(db)

        for order_data in parse_result["orders"]:
            # 创建订单记录
            parsed_order = ParsedOrder(
                file_upload_id=file_upload.id,
                po_number=order_data["po_number"],
                order_date=order_data["order_date"],
                delivery_date=order_data["delivery_date"],
                currency=order_data["currency"],
                ship_name=order_data["ship_name"],
                ship_code=order_data["ship_code"],
                order_type=order_data["order_type"],
                destination=order_data["destination"],
                port_code=order_data["port_code"],
                supplier_name=order_data["supplier_name"],
                raw_header_data=order_data["raw_data"]
            )

            db.add(parsed_order)
            db.flush()  # 获取ID

            # 创建订单项目记录
            total_amount = 0.0
            for item_data in order_data["items"]:
                # 匹配产品
                match_result = product_matcher.match_product(item_data)

                parsed_item = ParsedOrderItem(
                    order_id=parsed_order.id,
                    line_number=item_data["row_index"],
                    product_id_from_file=item_data["product_id_from_file"],
                    product_code=item_data["product_code"],
                    quantity=item_data["quantity"],
                    unit=item_data["unit"],
                    unit_price=item_data["unit_price"],
                    total_price=item_data["total_price"],
                    description=item_data["description"],
                    raw_detail_data=item_data["raw_data"],
                    matched_product_id=match_result.get("matched_product_id"),
                    match_confidence=match_result.get("confidence", 0.0),
                    match_method=match_result.get("match_method"),
                    match_notes=match_result.get("match_notes")
                )

                db.add(parsed_item)
                total_amount += item_data["total_price"]

            # 更新订单总金额
            parsed_order.total_amount = total_amount

        # 更新文件处理状态
        file_upload.processing_status = "analyzed"
        file_upload.total_orders_found = parse_result["total_orders"]
        file_upload.total_items_found = parse_result["total_items"]

        if parse_result["errors"]:
            file_upload.error_message = "; ".join(parse_result["errors"][:5])  # 只保存前5个错误

        db.commit()

        return {
            "success": True,
            "message": "文件解析完成",
            "total_orders": parse_result["total_orders"],
            "total_items": parse_result["total_items"],
            "errors": parse_result["errors"]
        }

    except HTTPException:
        raise
    except Exception as e:
        # 更新错误状态
        if 'file_upload' in locals():
            file_upload.processing_status = "failed"
            file_upload.error_message = str(e)
            db.commit()

        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")

@router.get("/file-uploads")
async def get_file_uploads(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    获取用户的文件上传记录
    """
    try:
        uploads = db.query(OrderFileUpload).filter(
            OrderFileUpload.uploaded_by == current_user.id
        ).order_by(OrderFileUpload.created_at.desc()).offset(skip).limit(limit).all()

        result = []
        for upload in uploads:
            result.append({
                "id": upload.id,
                "original_file_name": upload.original_file_name,
                "file_size": upload.file_size,
                "upload_status": upload.upload_status,
                "processing_status": upload.processing_status,
                "total_orders_found": upload.total_orders_found,
                "total_items_found": upload.total_items_found,
                "error_message": upload.error_message,
                "created_at": upload.created_at,
                "country": {
                    "id": upload.country.id,
                    "name": upload.country.name
                } if upload.country else None,
                "ship": {
                    "id": upload.ship.id,
                    "name": upload.ship.name
                } if upload.ship else None
            })

        return {
            "success": True,
            "data": result,
            "total": len(result)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")

@router.get("/parsed-orders/{file_upload_id}")
async def get_parsed_orders(
    file_upload_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    获取解析出的订单列表
    """
    try:
        # 验证文件所有权
        file_upload = db.query(OrderFileUpload).filter(
            OrderFileUpload.id == file_upload_id,
            OrderFileUpload.uploaded_by == current_user.id
        ).first()

        if not file_upload:
            raise HTTPException(status_code=404, detail="文件记录不存在")

        # 获取解析的订单
        orders = db.query(ParsedOrder).filter(
            ParsedOrder.file_upload_id == file_upload_id
        ).all()

        result = []
        for order in orders:
            # 获取订单项目
            items = db.query(ParsedOrderItem).filter(
                ParsedOrderItem.order_id == order.id
            ).all()

            # 统计匹配情况
            matched_items = sum(1 for item in items if item.matched_product_id)
            total_items = len(items)
            match_rate = (matched_items / total_items * 100) if total_items > 0 else 0

            order_data = {
                "id": order.id,
                "po_number": order.po_number,
                "order_date": order.order_date,
                "delivery_date": order.delivery_date,
                "currency": order.currency,
                "ship_name": order.ship_name,
                "ship_code": order.ship_code,
                "order_type": order.order_type,
                "destination": order.destination,
                "port_code": order.port_code,
                "supplier_name": order.supplier_name,
                "total_amount": float(order.total_amount),
                "is_selected": order.is_selected,
                "processing_status": order.processing_status,
                "total_items": total_items,
                "matched_items": matched_items,
                "match_rate": round(match_rate, 1),
                "items": [
                    {
                        "id": item.id,
                        "product_id_from_file": item.product_id_from_file,
                        "product_code": item.product_code,
                        "quantity": float(item.quantity),
                        "unit": item.unit,
                        "unit_price": float(item.unit_price),
                        "total_price": float(item.total_price),
                        "description": item.description,
                        "matched_product_id": item.matched_product_id,
                        "match_confidence": float(item.match_confidence) if item.match_confidence else 0.0,
                        "match_method": item.match_method,
                        "match_notes": item.match_notes,
                        "matched_product": {
                            "id": item.matched_product.id,
                            "name": item.matched_product.name,
                            "product_code": item.matched_product.product_code
                        } if item.matched_product else None
                    }
                    for item in items
                ]
            }

            result.append(order_data)

        return {
            "success": True,
            "data": result,
            "file_info": {
                "id": file_upload.id,
                "original_file_name": file_upload.original_file_name,
                "processing_status": file_upload.processing_status,
                "total_orders_found": file_upload.total_orders_found,
                "total_items_found": file_upload.total_items_found
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取订单列表失败: {str(e)}")

@router.post("/select-orders")
async def select_orders(
    file_upload_id: int,
    order_ids: List[int],
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    选择要处理的订单
    """
    try:
        # 验证文件所有权
        file_upload = db.query(OrderFileUpload).filter(
            OrderFileUpload.id == file_upload_id,
            OrderFileUpload.uploaded_by == current_user.id
        ).first()

        if not file_upload:
            raise HTTPException(status_code=404, detail="文件记录不存在")

        # 重置所有订单的选择状态
        db.query(ParsedOrder).filter(
            ParsedOrder.file_upload_id == file_upload_id
        ).update({"is_selected": False})

        # 设置选中的订单
        if order_ids:
            db.query(ParsedOrder).filter(
                ParsedOrder.file_upload_id == file_upload_id,
                ParsedOrder.id.in_(order_ids)
            ).update({"is_selected": True})

        db.commit()

        return {
            "success": True,
            "message": f"已选择 {len(order_ids)} 个订单",
            "selected_order_ids": order_ids
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"选择订单失败: {str(e)}")

@router.post("/generate-invoice/{file_upload_id}")
async def generate_invoice(
    file_upload_id: int,
    session_name: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    生成选中订单的发票
    """
    try:
        # 验证文件所有权
        file_upload = db.query(OrderFileUpload).filter(
            OrderFileUpload.id == file_upload_id,
            OrderFileUpload.uploaded_by == current_user.id
        ).first()

        if not file_upload:
            raise HTTPException(status_code=404, detail="文件记录不存在")

        # 获取选中的订单
        selected_orders = db.query(ParsedOrder).filter(
            ParsedOrder.file_upload_id == file_upload_id,
            ParsedOrder.is_selected == True
        ).all()

        if not selected_orders:
            raise HTTPException(status_code=400, detail="没有选择任何订单")

        # 收集所有订单项目
        all_items = []
        total_amount = 0.0
        total_items_count = 0

        for order in selected_orders:
            items = db.query(ParsedOrderItem).filter(
                ParsedOrderItem.order_id == order.id
            ).all()

            for item in items:
                item_data = {
                    "order_po_number": order.po_number,
                    "order_date": order.order_date.isoformat() if order.order_date else None,
                    "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
                    "ship_name": order.ship_name,
                    "destination": order.destination,
                    "product_id_from_file": item.product_id_from_file,
                    "product_code": item.product_code,
                    "description": item.description,
                    "quantity": float(item.quantity),
                    "unit": item.unit,
                    "unit_price": float(item.unit_price),
                    "total_price": float(item.total_price),
                    "currency": order.currency,
                    "matched_product": {
                        "id": item.matched_product.id,
                        "name": item.matched_product.name,
                        "product_code": item.matched_product.product_code
                    } if item.matched_product else None,
                    "match_confidence": float(item.match_confidence) if item.match_confidence else 0.0
                }

                all_items.append(item_data)
                total_amount += float(item.total_price)
                total_items_count += 1

        # 生成发票数据
        invoice_data = {
            "invoice_number": f"INV-{file_upload_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "generated_date": datetime.now().isoformat(),
            "file_info": {
                "id": file_upload.id,
                "original_file_name": file_upload.original_file_name,
                "upload_date": file_upload.created_at.isoformat()
            },
            "summary": {
                "total_orders": len(selected_orders),
                "total_items": total_items_count,
                "total_amount": total_amount,
                "currency": selected_orders[0].currency if selected_orders else "JPY"
            },
            "orders": [
                {
                    "id": order.id,
                    "po_number": order.po_number,
                    "order_date": order.order_date.isoformat() if order.order_date else None,
                    "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
                    "ship_name": order.ship_name,
                    "destination": order.destination,
                    "supplier_name": order.supplier_name,
                    "total_amount": float(order.total_amount)
                }
                for order in selected_orders
            ],
            "items": all_items
        }

        # 创建处理会话记录
        from app.models.models import OrderProcessingSession

        session = OrderProcessingSession(
            file_upload_id=file_upload_id,
            session_name=session_name or f"发票-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            selected_order_ids=[order.id for order in selected_orders],
            total_selected_orders=len(selected_orders),
            total_selected_items=total_items_count,
            total_amount=total_amount,
            status="invoiced",
            invoice_generated=True,
            invoice_data=invoice_data,
            created_by=current_user.id
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        return {
            "success": True,
            "message": "发票生成成功",
            "session_id": session.id,
            "invoice_data": invoice_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成发票失败: {str(e)}")

@router.get("/processing-sessions")
async def get_processing_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    获取用户的处理会话列表
    """
    try:
        from app.models.models import OrderProcessingSession

        sessions = db.query(OrderProcessingSession).filter(
            OrderProcessingSession.created_by == current_user.id
        ).order_by(OrderProcessingSession.created_at.desc()).offset(skip).limit(limit).all()

        result = []
        for session in sessions:
            result.append({
                "id": session.id,
                "session_name": session.session_name,
                "total_selected_orders": session.total_selected_orders,
                "total_selected_items": session.total_selected_items,
                "total_amount": float(session.total_amount),
                "status": session.status,
                "invoice_generated": session.invoice_generated,
                "created_at": session.created_at,
                "file_upload": {
                    "id": session.file_upload.id,
                    "original_file_name": session.file_upload.original_file_name
                } if session.file_upload else None
            })

        return {
            "success": True,
            "data": result,
            "total": len(result)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")
