"""
产品上传API v2 - 两阶段上传设计
1. 预检查阶段：验证数据但不保存
2. 上传阶段：实际保存到数据库
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import logging

from app.api import deps
from app.models.models import Product, Country, Category, Supplier, Port, User
from app.schemas.product import ProductCreate
from app.crud import product as crud_product
from app.api.deps import get_current_active_user

# 设置日志
logger = logging.getLogger(__name__)
router = APIRouter()

# 数据模型
class ProductRow(BaseModel):
    """单行产品数据"""
    product_name_en: str
    country_name: str
    category_name: str
    effective_from: str
    product_name_jp: Optional[str] = None
    code: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    unit_size: Optional[str] = None
    supplier_name: Optional[str] = None  # 改为可选字段
    pack_size: Optional[str] = None
    country_of_origin: Optional[str] = None
    brand: Optional[str] = None
    currency: Optional[str] = None
    status: Optional[bool] = True
    effective_to: Optional[str] = None
    port_name: Optional[str] = None

class ProductUploadData(BaseModel):
    """产品上传数据"""
    products: List[ProductRow]
    only_new: Optional[bool] = False  # 仅上传新产品

class ValidationResult(BaseModel):
    """验证结果"""
    valid: bool
    total_rows: int
    new_products: int
    duplicate_products: int
    error_count: int
    warning_count: int
    errors: List[str]
    warnings: List[str]
    duplicates: List[Dict[str, Any]]
    new_items: List[Dict[str, Any]]

class UploadResult(BaseModel):
    """上传结果"""
    success: bool
    total_rows: int
    created_count: int
    skipped_count: int
    error_count: int
    errors: List[str]
    created_products: List[Dict[str, Any]]

def load_reference_data(db: Session) -> Dict[str, Dict[str, int]]:
    """加载参考数据"""
    return {
        'countries': {c.name: c.id for c in db.query(Country).all()},
        'categories': {c.name: c.id for c in db.query(Category).all()},
        'suppliers': {s.name: s.id for s in db.query(Supplier).all()},
        'ports': {p.name: p.id for p in db.query(Port).all()}
    }

def validate_required_fields(product: ProductRow, row_num: int) -> Optional[str]:
    """验证必填字段"""
    if not product.product_name_en or not product.product_name_en.strip():
        return f"第{row_num}行: 产品英文名称不能为空"
    
    if not product.country_name or not product.country_name.strip():
        return f"第{row_num}行: 国家名称不能为空"
    
    if not product.category_name or not product.category_name.strip():
        return f"第{row_num}行: 类别名称不能为空"
    
    # supplier_name 现在是可选字段，不需要验证
    # if not product.supplier_name or not product.supplier_name.strip():
    #     return f"第{row_num}行: 供应商名称不能为空"
    
    if not product.effective_from or not product.effective_from.strip():
        return f"第{row_num}行: 生效日期不能为空"
    
    return None

def validate_foreign_keys(product: ProductRow, row_num: int, reference_data: Dict) -> Optional[str]:
    """验证外键有效性（严格错误）"""
    # 检查国家
    if product.country_name not in reference_data['countries']:
        return f"第{row_num}行: 找不到国家 '{product.country_name}'"

    # 检查类别
    if product.category_name not in reference_data['categories']:
        return f"第{row_num}行: 找不到类别 '{product.category_name}'"

    # 检查港口（可选）
    if product.port_name and product.port_name not in reference_data['ports']:
        return f"第{row_num}行: 找不到港口 '{product.port_name}'"

    return None

def validate_warnings(product: ProductRow, row_num: int, reference_data: Dict) -> Optional[str]:
    """验证警告项（不阻止上传）"""
    # 检查供应商（改为警告）
    if product.supplier_name and product.supplier_name.strip() and product.supplier_name not in reference_data['suppliers']:
        return f"第{row_num}行: 找不到供应商 '{product.supplier_name}'"

    return None

def check_duplicate(product: ProductRow, db: Session, reference_data: Dict) -> bool:
    """检查重复性：基于数据库的唯一约束"""
    country_id = reference_data['countries'].get(product.country_name)
    if not country_id:
        return False

    # 移除产品代码重复检查，允许不同国家使用相同产品代码
    # 原检查逻辑：code + country_id + supplier_id (已移除)
    # 现在只检查数据库的实际唯一约束

    # 检查约束2: country_id + product_name_en + port_id
    port_id = reference_data['ports'].get(product.port_name) if product.port_name else None
    existing = db.query(Product).filter(
        Product.country_id == country_id,
        Product.product_name_en == product.product_name_en.strip(),
        Product.port_id == port_id
    ).first()

    return existing is not None

@router.post("/validate", response_model=ValidationResult)
async def validate_products(
    data: ProductUploadData,
    db: Session = Depends(deps.get_db)
    # current_user: User = Depends(get_current_active_user)  # 临时禁用认证
):
    """
    预检查产品数据
    验证字段完整性、外键有效性和重复性，但不保存数据
    """
    logger.info(f"开始预检查产品数据，共 {len(data.products)} 行")
    
    # 加载参考数据
    reference_data = load_reference_data(db)
    
    # 初始化结果
    result = ValidationResult(
        valid=True,
        total_rows=len(data.products),
        new_products=0,
        duplicate_products=0,
        error_count=0,
        warning_count=0,
        errors=[],
        warnings=[],
        duplicates=[],
        new_items=[]
    )
    
    # 逐行验证
    for i, product in enumerate(data.products):
        row_num = i + 1
        
        # 1. 验证必填字段
        field_error = validate_required_fields(product, row_num)
        if field_error:
            result.errors.append(field_error)
            result.error_count += 1
            result.valid = False
            continue
        
        # 2. 验证外键
        fk_error = validate_foreign_keys(product, row_num, reference_data)
        if fk_error:
            result.errors.append(fk_error)
            result.error_count += 1
            result.valid = False
            continue

        # 2.5. 检查警告项（不阻止上传）
        warning = validate_warnings(product, row_num, reference_data)
        if warning:
            result.warnings.append(warning)
            result.warning_count += 1

        # 3. 检查重复
        is_duplicate = check_duplicate(product, db, reference_data)
        if is_duplicate:
            result.duplicate_products += 1
            result.duplicates.append({
                "row": row_num,
                "code": product.code,
                "product_name_en": product.product_name_en,
                "reason": f"产品名称 '{product.product_name_en}' 在相同国家和港口下已存在"
            })
        else:
            result.new_products += 1
            result.new_items.append({
                "row": row_num,
                "code": product.code,
                "product_name_en": product.product_name_en
            })
    
    logger.info(f"预检查完成: 新增 {result.new_products}, 重复 {result.duplicate_products}, 错误 {result.error_count}, 警告 {result.warning_count}")

    return result

def create_product_from_row(product: ProductRow, db: Session, reference_data: Dict) -> Dict[str, Any]:
    """从行数据创建产品"""
    try:
        # 获取外键ID
        country_id = reference_data['countries'][product.country_name]
        category_id = reference_data['categories'][product.category_name]
        supplier_id = reference_data['suppliers'].get(product.supplier_name) if product.supplier_name else None
        port_id = reference_data['ports'].get(product.port_name) if product.port_name else None

        # 构建产品数据
        product_data = {
            "product_name_en": product.product_name_en.strip(),
            "country_id": country_id,
            "category_id": category_id,
            "supplier_id": supplier_id,
            "effective_from": product.effective_from,
        }

        # 添加可选字段
        if product.product_name_jp:
            product_data["product_name_jp"] = product.product_name_jp.strip()
        if product.code:
            product_data["code"] = product.code.strip()
        if product.unit:
            product_data["unit"] = product.unit.strip()
        if product.price is not None:
            product_data["price"] = product.price
        if product.unit_size:
            product_data["unit_size"] = product.unit_size.strip()
        if product.pack_size:
            product_data["pack_size"] = product.pack_size.strip()
        if product.country_of_origin:
            product_data["country_of_origin"] = product.country_of_origin.strip()
        if product.brand:
            product_data["brand"] = product.brand.strip()
        if product.currency:
            product_data["currency"] = product.currency.strip()
        if product.status is not None:
            product_data["status"] = product.status
        if product.effective_to:
            product_data["effective_to"] = product.effective_to
        if port_id:
            product_data["port_id"] = port_id

        # 创建产品
        created_product = crud_product.create(db, obj_in=ProductCreate(**product_data))

        return {
            "id": created_product.id,
            "product_name_en": created_product.product_name_en,
            "code": created_product.code,
            "country_id": created_product.country_id,
            "supplier_id": created_product.supplier_id
        }

    except Exception as e:
        logger.error(f"创建产品失败: {str(e)}")
        raise e

@router.post("/upload", response_model=UploadResult)
async def upload_products(
    data: ProductUploadData,
    db: Session = Depends(deps.get_db)
    # current_user: User = Depends(get_current_active_user)  # 临时禁用认证
):
    """
    实际上传产品数据
    跳过重复数据，只保存新的产品
    """
    logger.info(f"开始上传产品数据，共 {len(data.products)} 行")

    # 加载参考数据
    reference_data = load_reference_data(db)

    # 初始化结果
    result = UploadResult(
        success=True,
        total_rows=len(data.products),
        created_count=0,
        skipped_count=0,
        error_count=0,
        errors=[],
        created_products=[]
    )

    # 🔥 第一阶段：预过滤和分类
    valid_products = []
    duplicate_products = []
    error_products = []

    logger.info("开始预过滤产品数据...")

    for i, product in enumerate(data.products):
        row_num = i + 1

        # 1. 验证必填字段
        field_error = validate_required_fields(product, row_num)
        if field_error:
            error_products.append((row_num, product, field_error))
            continue

        # 2. 验证外键
        fk_error = validate_foreign_keys(product, row_num, reference_data)
        if fk_error:
            error_products.append((row_num, product, fk_error))
            continue

        # 3. 检查重复
        is_duplicate = check_duplicate(product, db, reference_data)
        if is_duplicate:
            duplicate_products.append((row_num, product))
            continue

        # 通过所有检查的产品
        valid_products.append((row_num, product))

    # 更新统计
    result.skipped_count = len(duplicate_products)
    result.error_count = len(error_products)
    result.errors = [error for _, _, error in error_products]

    logger.info(f"预过滤完成: 有效 {len(valid_products)}, 重复 {len(duplicate_products)}, 错误 {len(error_products)}")

    # 🔥 第二阶段：批量创建有效产品
    if valid_products:
        logger.info(f"开始批量创建 {len(valid_products)} 个产品...")

        for row_num, product in valid_products:
            try:
                created_product = create_product_from_row(product, db, reference_data)
                db.commit()  # 立即提交每个产品

                result.created_count += 1
                result.created_products.append(created_product)
                logger.debug(f"成功创建产品: 第{row_num}行 - {product.code}")

            except Exception as e:
                db.rollback()  # 回滚当前产品
                error_msg = f"第{row_num}行创建失败: {str(e)}"
                result.errors.append(error_msg)
                result.error_count += 1
                logger.error(error_msg)

    # 记录跳过的重复产品
    for row_num, product in duplicate_products:
        logger.debug(f"跳过重复产品: 第{row_num}行 - {product.code}")

    # 判断整体成功状态
    # 如果有创建或跳过的产品，即使有少量错误也算部分成功
    if result.error_count > 0 and result.created_count == 0 and result.skipped_count == 0:
        result.success = False
    # 如果错误率超过50%，也算失败
    elif result.error_count > (result.total_rows * 0.5):
        result.success = False

    logger.info(f"上传完成: 创建 {result.created_count}, 跳过 {result.skipped_count}, 错误 {result.error_count}")

    return result
