from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
import os
import shutil
import logging
import tempfile
from datetime import datetime

from app import crud
from app.api import deps
from app.schemas.cruise_order import (
    CruiseOrderUploadResponse,
    CruiseOrderConfirmRequest,
    CruiseOrderConfirmResponse,
    CruiseOrderAnalysisResponse,
    CruiseOrderMatchRequest,
    CruiseOrderMatchResponse,
    CruiseOrderHeader
)
from app.services.cruise_excel_parser import CruiseExcelParser
from app.services.cruise_product_matcher import CruiseProductMatcher
from app.models.models import Order as OrderModel, OrderItem as OrderItemModel, Product as ProductModel, Supplier, Ship, Port
from app.schemas.order import OrderCreate

router = APIRouter()
logger = logging.getLogger(__name__)

# 临时存储解析结果
_temp_storage = {}


@router.post("/upload", response_model=CruiseOrderUploadResponse)
async def upload_cruise_order_file(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...)
):
    """
    上传邮轮订单Excel文件并解析
    """
    try:
        logger.info(f"开始上传邮轮订单文件: {file.filename}")
        
        # 验证文件类型
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=400,
                detail="只支持Excel文件格式 (.xlsx, .xls)"
            )
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            temp_file_path = temp_file.name
            
            # 保存上传的文件
            content = await file.read()
            temp_file.write(content)
        
        try:
            # 解析Excel文件
            parser = CruiseExcelParser()
            orders = parser.parse_cruise_order_file(temp_file_path)
            
            # 验证订单数据
            valid_orders, errors = parser.validate_orders(orders)
            
            if errors:
                logger.warning(f"解析文件时发现错误: {errors}")
            
            # 生成上传ID
            upload_id = int(datetime.now().timestamp() * 1000)
            
            # 临时存储解析结果
            _temp_storage[upload_id] = {
                'file_name': file.filename,
                'orders': valid_orders,
                'errors': errors,
                'created_at': datetime.now()
            }
            
            # 获取分析摘要
            analysis = parser.get_analysis_summary(valid_orders)
            
            response = CruiseOrderUploadResponse(
                upload_id=upload_id,
                file_name=file.filename,
                total_orders=len(valid_orders),
                total_products=sum(len(order.products) for order in valid_orders),
                orders=valid_orders,
                created_at=datetime.now()
            )
            
            logger.info(f"文件解析完成: {len(valid_orders)} 个有效订单, {len(errors)} 个错误")
            return response
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"上传邮轮订单文件失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"处理文件失败: {str(e)}"
        )


@router.post("/confirm", response_model=CruiseOrderConfirmResponse)
async def confirm_cruise_orders(
    *,
    db: Session = Depends(deps.get_db),
    confirm_request: CruiseOrderConfirmRequest
):
    """
    确认并导入邮轮订单到系统
    """
    try:
        upload_id = confirm_request.upload_id
        
        # 从临时存储获取数据
        if upload_id not in _temp_storage:
            raise HTTPException(
                status_code=404,
                detail="未找到上传记录或记录已过期"
            )
        
        upload_data = _temp_storage[upload_id]
        orders = upload_data['orders']
        
        # 过滤要确认的订单
        orders_to_confirm = [
            order for order in orders 
            if order.po_number in confirm_request.orders_to_confirm
        ]
        
        if not orders_to_confirm:
            raise HTTPException(
                status_code=400,
                detail="没有找到要确认的订单"
            )
        
        created_orders = []
        
        for order_data in orders_to_confirm:
            try:
                # 创建订单
                order_id = await _create_order_from_cruise_data(db, order_data)
                created_orders.append(order_id)
                logger.info(f"成功创建订单: {order_data.po_number} -> ID: {order_id}")
                
            except Exception as e:
                logger.error(f"创建订单失败: {order_data.po_number}, 错误: {str(e)}")
                continue
        
        # 清理临时存储
        del _temp_storage[upload_id]
        
        response = CruiseOrderConfirmResponse(
            upload_id=upload_id,
            confirmed_orders=len(created_orders),
            created_orders=created_orders,
            message=f"成功导入 {len(created_orders)} 个订单"
        )
        
        logger.info(f"邮轮订单确认完成: 创建了 {len(created_orders)} 个订单")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"确认邮轮订单失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"确认订单失败: {str(e)}"
        )


@router.get("/analysis/{upload_id}", response_model=CruiseOrderAnalysisResponse)
def get_cruise_order_analysis(
    upload_id: int,
    db: Session = Depends(deps.get_db)
):
    """
    获取邮轮订单分析结果
    """
    try:
        if upload_id not in _temp_storage:
            raise HTTPException(
                status_code=404,
                detail="未找到上传记录或记录已过期"
            )
        
        upload_data = _temp_storage[upload_id]
        orders = upload_data['orders']
        
        parser = CruiseExcelParser()
        analysis = parser.get_analysis_summary(orders)
        
        # 按分类统计产品
        products_by_category = {}
        for order in orders:
            for product in order.products:
                category = "未分类"  # 默认分类
                if category not in products_by_category:
                    products_by_category[category] = 0
                products_by_category[category] += 1
        
        response = CruiseOrderAnalysisResponse(
            upload_id=upload_id,
            total_orders=analysis.get('total_orders', 0),
            total_products=analysis.get('total_products', 0),
            products_by_category=products_by_category,
            orders_by_supplier=analysis.get('orders_by_supplier', {}),
            total_value=analysis.get('total_value', 0.0),
            currency='JPY',
            analysis_summary=analysis
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取邮轮订单分析失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取分析失败: {str(e)}"
        )


@router.post("/match", response_model=CruiseOrderMatchResponse)
def match_cruise_order_products(
    *,
    db: Session = Depends(deps.get_db),
    match_request: CruiseOrderMatchRequest
):
    """
    匹配邮轮订单产品与数据库中的产品
    """
    try:
        upload_id = match_request.upload_id
        
        # 从临时存储获取数据
        if upload_id not in _temp_storage:
            raise HTTPException(
                status_code=404,
                detail="未找到上传记录或记录已过期"
            )
        
        upload_data = _temp_storage[upload_id]
        orders = upload_data['orders']
        
        # 收集所有产品，保持与订单的关联关系
        all_products = []
        product_delivery_dates = []  # 存储每个产品对应的送货时间

        for order in orders:
            for product in order.products:
                all_products.append(product)
                product_delivery_dates.append(order.delivery_date)

        logger.info(f"开始匹配 {len(all_products)} 个产品")

        # 使用产品匹配器，传递送货时间信息
        matcher = CruiseProductMatcher(db)
        match_results = []

        # 逐个匹配产品，传递对应的送货时间
        for i, product in enumerate(all_products):
            delivery_date = product_delivery_dates[i]
            product_match_results = matcher.match_products([product], delivery_date)
            match_results.extend(product_match_results)
        
        # 获取统计信息
        stats = matcher.get_match_statistics(match_results)
        
        response = CruiseOrderMatchResponse(
            upload_id=upload_id,
            total_products=stats['total_products'],
            matched_products=stats['matched_products'],
            unmatched_products=stats['unmatched_products'],
            match_results=match_results
        )
        
        logger.info(f"产品匹配完成: {stats['matched_products']}/{stats['total_products']} 个产品匹配成功")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"产品匹配失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"产品匹配失败: {str(e)}"
        )


async def _create_order_from_cruise_data(db: Session, order_data: CruiseOrderHeader) -> int:
    """
    从邮轮订单数据创建系统订单
    """
    try:
        # 查找或创建船只
        ship = db.query(Ship).filter(Ship.name == order_data.ship_name).first()
        if not ship:
            ship = Ship(name=order_data.ship_name, code=order_data.ship_code or "")
            db.add(ship)
            db.flush()
        
        # 查找或创建港口
        port = db.query(Port).filter(Port.name == order_data.destination_port).first()
        if not port:
            port = Port(name=order_data.destination_port, code="")
            db.add(port)
            db.flush()
        
        # 查找或创建供应商
        supplier = db.query(Supplier).filter(Supplier.name == order_data.supplier_name).first()
        if not supplier:
            supplier = Supplier(
                name=order_data.supplier_name,
                contact_person="",
                email="",
                phone=""
            )
            db.add(supplier)
            db.flush()
        
        # 创建订单
        order = OrderModel(
            order_no=order_data.po_number,
            ship_id=ship.id,
            company_id=1,  # 默认公司ID，需要根据实际情况调整
            port_id=port.id,
            order_date=datetime.now(),
            delivery_date=order_data.delivery_date,
            status="not_started",
            total_amount=order_data.total_amount,
            notes=f"从邮轮订单文件导入: {order_data.po_number}"
        )
        
        db.add(order)
        db.flush()
        
        # 创建订单项
        for product_data in order_data.products:
            # 查找或创建产品
            product = db.query(ProductModel).filter(
                ProductModel.product_name_en == product_data.product_name
            ).first()
            
            if not product:
                product = ProductModel(
                    product_name_en=product_data.product_name,
                    product_name_zh="",
                    product_name_jp="",
                    code=product_data.product_id or "",
                    category_id=1,  # 默认分类，需要根据实际情况调整
                    supplier_id=supplier.id,
                    purchase_price=product_data.unit_price,
                    currency=product_data.currency,
                    is_active=True
                )
                db.add(product)
                db.flush()
            
            # 创建订单项
            order_item = OrderItemModel(
                order_id=order.id,
                product_id=product.id,
                supplier_id=supplier.id,
                quantity=product_data.quantity,
                price=product_data.unit_price,
                total=product_data.total_price,
                status="unprocessed"
            )
            
            db.add(order_item)
        
        db.commit()
        return order.id
        
    except Exception as e:
        db.rollback()
        logger.error(f"创建订单失败: {str(e)}")
        raise Exception(f"创建订单失败: {str(e)}")


@router.get("/uploads", response_model=List[dict])
def get_upload_history():
    """
    获取上传历史记录
    """
    try:
        history = []
        for upload_id, data in _temp_storage.items():
            history.append({
                'upload_id': upload_id,
                'file_name': data['file_name'],
                'total_orders': len(data['orders']),
                'total_errors': len(data['errors']),
                'created_at': data['created_at']
            })
        
        # 按创建时间倒序排列
        history.sort(key=lambda x: x['created_at'], reverse=True)
        return history
        
    except Exception as e:
        logger.error(f"获取上传历史失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取上传历史失败: {str(e)}"
        )


@router.delete("/uploads/{upload_id}")
def delete_upload_record(upload_id: int):
    """
    删除上传记录
    """
    try:
        if upload_id not in _temp_storage:
            raise HTTPException(
                status_code=404,
                detail="未找到上传记录"
            )
        
        del _temp_storage[upload_id]
        return {"message": "上传记录已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除上传记录失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"删除上传记录失败: {str(e)}"
        )