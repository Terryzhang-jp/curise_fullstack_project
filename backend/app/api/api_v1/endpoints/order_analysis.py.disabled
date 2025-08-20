from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
from pathlib import Path
from app.api import deps
from app.schemas.order_analysis import OrderAnalysisCreate, OrderAnalysis, OrderAnalysisItem
from app.schemas.order_assignment import OrderAssignmentCreate, OrderAssignment
from app.crud.crud_order_analysis import order_analysis
from app.crud.crud_order_assignment import order_assignment
from app.crud.crud_supplier import supplier as crud_supplier
from app.crud.crud_ship import ship as crud_ship
from app.utils.excel_parser import OrderParser
from app.utils.excel_generator import ExcelGenerator
from app.utils.email_sender import EmailSender
from datetime import datetime, timedelta

router = APIRouter()

# 创建上传文件保存目录
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload", response_model=OrderAnalysis)
async def upload_order(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    country_id: int = Form(...),
    ship_id: int = Form(...)
) -> Any:
    """
    上传订单文件并进行解析
    """
    try:
        # 保存文件
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
        
        # 解析订单文件
        parser = OrderParser(str(file_path))
        orders = parser.parse()
        
        # 创建订单上传记录
        result = order_analysis.create_from_upload(
            db=db,
            file_name=file.filename,
            country_id=country_id,
            ship_id=ship_id,
            orders=orders
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="No valid orders found in file")
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"订单解析失败: {str(e)}"
        )
    finally:
        # 清理临时文件
        if os.path.exists(file_path):
            os.remove(file_path)

@router.get("/", response_model=List[OrderAnalysis])
def read_order_analyses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None
) -> Any:
    """
    获取订单分析列表
    """
    return order_analysis.get_multi(db, skip=skip, limit=limit, status=status)

@router.get("/{analysis_id}", response_model=OrderAnalysis)
def read_order_analysis(
    *,
    db: Session = Depends(deps.get_db),
    analysis_id: int
) -> Any:
    """
    获取订单分析详情
    """
    result = order_analysis.get(db, id=analysis_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="订单分析不存在"
        )
    return result

@router.get("/{analysis_id}/items", response_model=List[OrderAnalysisItem])
def read_order_analysis_items(
    *,
    db: Session = Depends(deps.get_db),
    analysis_id: int,
    category_id: Optional[int] = None
) -> Any:
    """
    获取订单分析项目列表
    """
    return order_analysis.get_items(
        db, 
        analysis_id=analysis_id, 
        category_id=category_id
    )

@router.post("/assign", response_model=List[OrderAssignment])
def assign_orders(
    *,
    db: Session = Depends(deps.get_db),
    assignment_in: OrderAssignmentCreate
) -> Any:
    """
    分配订单给供应商
    """
    try:
        # 创建订单分配
        assignments = order_assignment.create_assignments(
            db=db,
            obj_in=assignment_in
        )
        
        if not assignments:
            raise HTTPException(
                status_code=400,
                detail="没有可分配的订单项目"
            )
        
        # 获取供应商信息
        supplier = crud_supplier.get(db, id=assignment_in.supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=404,
                detail="供应商不存在"
            )
        
        # 获取船舶信息
        analysis_item = assignments[0]
        ship = crud_ship.get(db, id=analysis_item.order_analysis.ship_id)
        if not ship:
            raise HTTPException(
                status_code=404,
                detail="船舶信息不存在"
            )
        
        # 准备订单项目数据
        order_items = []
        for assignment in assignments:
            item = assignment.order_analysis_item
            order_items.append({
                'product_code': item.product_code,
                'product_name': item.matched_product.name if item.matched_product else '-',
                'category_name': item.category.name if item.category else '-',
                'quantity': assignment.quantity,
                'unit': item.unit,
                'unit_price': assignment.unit_price,
                'total_price': assignment.total_price,
                'description': item.description
            })
        
        # 生成Excel文件
        delivery_date = datetime.now() + timedelta(days=7)  # 默认交货日期为7天后
        excel_generator = ExcelGenerator()
        excel_file = excel_generator.generate_supplier_order(
            supplier_name=supplier.name,
            order_items=order_items,
            ship_name=ship.name,
            delivery_date=delivery_date
        )
        
        # 发送邮件
        email_sender = EmailSender()
        email_sent = email_sender.send_supplier_order(
            supplier_email=supplier.email,
            supplier_name=supplier.name,
            order_file=excel_file
        )
        
        # 更新通知状态
        for assignment in assignments:
            order_assignment.update_notification_status(
                db=db,
                assignment_id=assignment.id,
                notification_status="sent" if email_sent else "failed"
            )
        
        return assignments
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"订单分配失败: {str(e)}"
        )
