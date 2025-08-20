from typing import List, Any, Optional, Dict, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from collections import defaultdict

from app import crud
from app.api import deps
from app.schemas.product import ProductCreate, ProductUpdate, Product, CheckResult
from app.models.models import Product as ProductModel, Supplier, OrderItem
from app.models.models import User as UserModel

# 添加新的schema
from pydantic import BaseModel
from app.schemas.common import SuccessResponse
from datetime import datetime
from decimal import Decimal

# ProductHistory 功能已移除 - 以下代码已禁用
# class ProductHistoryResponse(BaseModel):
#     id: int
#     product_name_en: str
#     product_name_jp: Optional[str]
#     code: Optional[str]
#     category_id: int
#     country_id: int
#     supplier_id: Optional[int]
#     unit: Optional[str]
#     price: Decimal
#     unit_size: Optional[str]
#     pack_size: Optional[int]
#     country_of_origin: Optional[Union[int, str]]
#     brand: Optional[str]
#     currency: Optional[str]
#     effective_from: Optional[datetime]
#     effective_to: Optional[datetime]
#     status: str
#     created_at: Optional[datetime]
#     updated_at: Optional[datetime]
#     history_date: datetime
# 
#     category: Optional[dict]
#     country: Optional[dict]
#     supplier: Optional[dict]

# Config 已移动到其他schemas

router = APIRouter()

@router.get("/", response_model=List[Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: Optional[int] = None,
    category_id: Optional[int] = None,
    country_id: Optional[int] = None,
) -> Any:
    """
    获取产品列表
    """
    # 如果没有指定limit，获取所有数据
    actual_limit = limit if limit is not None else 10000

    if category_id:
        return crud.product.get_by_category(db, category_id=category_id, skip=skip, limit=actual_limit)
    if country_id:
        return crud.product.get_by_country(db, country_id=country_id, skip=skip, limit=actual_limit)
    return crud.product.get_multi(db, skip=skip, limit=actual_limit)

@router.get("/search", response_model=List[Product])
def search_products(
    db: Session = Depends(deps.get_db),
    name: Optional[str] = None,
    product_name_en: Optional[str] = None,
    code: Optional[str] = None,
    category_id: Optional[int] = None,
    country_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    skip: int = 0,
    limit: Optional[int] = None,
) -> Any:
    """
    搜索产品，支持按名称、代码、类别、国家和供应商搜索
    """
    print("搜索参数:")
    print(f"name: {name}, type: {type(name)}")
    print(f"product_name_en: {product_name_en}, type: {type(product_name_en)}")
    print(f"code: {code}, type: {type(code)}")
    print(f"category_id: {category_id}, type: {type(category_id)}")
    print(f"country_id: {country_id}, type: {type(country_id)}")
    print(f"supplier_id: {supplier_id}, type: {type(supplier_id)}")

    try:
        # 如果没有指定limit，获取所有数据
        actual_limit = limit if limit is not None else 10000

        results = crud.product.search_products(
            db,
            name=name,
            product_name_en=product_name_en,
            code=code,
            category_id=category_id,
            country_id=country_id,
            supplier_id=supplier_id,
            skip=skip,
            limit=actual_limit
        )
        print(f"搜索结果数量: {len(results)}")
        return results
    except Exception as e:
        print(f"搜索出错: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"搜索失败: {str(e)}"
        )

@router.get("/check", response_model=CheckResult)
def check_products(
    db: Session = Depends(deps.get_db),
    order_by_code: bool = True,
    ascending: bool = True,
) -> Any:
    """
    检查重复产品并返回排序后的列表
    """
    result = crud.product.check_duplicates(
        db,
        order_by_code=order_by_code,
        ascending=ascending
    )
    return CheckResult(
        products=result["products"],
        duplicates=result["duplicates"] or []
    )



@router.post("/", response_model=Product)
def create_product(
    *,
    db: Session = Depends(deps.get_db),
    product_in: ProductCreate,
) -> Any:
    """
    创建新产品
    """
    # 将ProductCreate转换为字典，并删除name字段防止传递给数据库模型
    product_data = product_in.dict()
    if "name" in product_data:
        del product_data["name"]

    # 处理日期字段，确保是date格式
    for date_field in ["effective_from", "effective_to"]:
        if date_field in product_data and product_data[date_field]:
            # 如果只有日期部分（YYYY-MM-DD），添加时间部分
            if isinstance(product_data[date_field], str) and len(product_data[date_field]) == 10:
                # 添加时间部分为00:00:00
                product_data[date_field] = f"{product_data[date_field]}T00:00:00"

    if product_in.code:
        product_obj = crud.product.get_by_code_and_country(
            db, code=product_in.code, country_id=product_in.country_id
        )
        if product_obj:
            raise HTTPException(
                status_code=400,
                detail="该国家已存在相同产品代码",
            )

    # 检查数据库唯一约束: country_id + product_name_en + port_id
    product_obj = crud.product.get_by_unique_constraint(
        db,
        country_id=product_in.country_id,
        product_name_en=product_in.product_name_en,
        port_id=product_in.port_id
    )
    if product_obj:
        raise HTTPException(
            status_code=400,
            detail="该国家和港口已存在同名产品",
        )
    return crud.product.create(db, obj_in=product_data)

@router.put("/{product_id}", response_model=Product)
def update_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    product_in: ProductUpdate,
) -> Any:
    """
    更新产品信息
    """
    # 将ProductUpdate转换为字典，并删除name字段防止传递给数据库模型
    product_data = product_in.dict(exclude_unset=True)
    if "name" in product_data:
        del product_data["name"]

    # 处理country_of_origin字段
    if "country_of_origin" in product_data and product_data["country_of_origin"] is not None:
        country_value = product_data["country_of_origin"]
        # 如果已经是整数，直接使用
        if isinstance(country_value, int):
            pass
        # 如果是字符串，保留原始值
        elif isinstance(country_value, str) and country_value:
            # 保留字符串值，不做转换
            pass
        else:
            # 其他情况设为null
            product_data["country_of_origin"] = None

    # 处理日期字段，确保是date格式
    for date_field in ["effective_from", "effective_to"]:
        if date_field in product_data and product_data[date_field]:
            # 如果只有日期部分（YYYY-MM-DD），添加时间部分
            if isinstance(product_data[date_field], str) and len(product_data[date_field]) == 10:
                # 添加时间部分为00:00:00
                product_data[date_field] = f"{product_data[date_field]}T00:00:00"

    product_obj = crud.product.get(db, id=product_id)
    if not product_obj:
        raise HTTPException(
            status_code=404,
            detail="产品不存在",
        )
    return crud.product.update(db, db_obj=product_obj, obj_in=product_data)

@router.get("/{product_id}", response_model=Product)
def read_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
) -> Any:
    """
    根据ID获取产品信息
    """
    product_obj = crud.product.get(db, id=product_id)
    if not product_obj:
        raise HTTPException(
            status_code=404,
            detail="产品不存在",
        )
    return product_obj

@router.delete("/{product_id}", response_model=SuccessResponse)
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: UserModel = Depends(deps.get_current_active_user),
) -> SuccessResponse:
    """
    删除产品（需要管理员权限）
    """
    # 检查权限：只有管理员和超级管理员可以删除产品
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=403,
            detail="权限不足，只有管理员可以删除产品",
        )

    product_obj = crud.product.get(db, id=product_id)
    if not product_obj:
        raise HTTPException(
            status_code=404,
            detail="产品不存在",
        )
    crud.product.remove(db, id=product_id)
    return SuccessResponse(message="产品删除成功")

# ProductHistory 端点已移除
# @router.get("/{product_id}/history", response_model=List[ProductHistoryResponse])
# def read_product_history(
#     *,
#     db: Session = Depends(deps.get_db),
#     product_id: int,
# ) -> Any:
#     """
#     获取产品的历史记录
#     """
#     product = crud.product.get(db, id=product_id)
#     if not product:
#         raise HTTPException(
#             status_code=404,
#             detail="产品不存在",
#         )
# 
#     history_records = db.query(ProductHistory)\
#         .options(
#             joinedload(ProductHistory.category),
#             joinedload(ProductHistory.country),
#             joinedload(ProductHistory.supplier)
#         )\
#         .filter(ProductHistory.product_id == product_id)\
#         .order_by(ProductHistory.history_date.desc()).limit(10).all()
# 
#     # 手动构建响应数据，确保关联对象被正确序列化
#     result = []
#     for record in history_records:
#         history_data = {
#             "id": record.id,
#             "product_name_en": record.product_name_en,
#             "product_name_jp": record.product_name_jp,
#             "code": record.code,
#             "category_id": record.category_id,
#             "country_id": record.country_id,
#             "supplier_id": record.supplier_id,
#             "unit": record.unit,
#             "price": record.price,
#             "unit_size": record.unit_size,
#             "pack_size": record.pack_size,
#             "country_of_origin": record.country_of_origin,
#             "brand": record.brand,
#             "currency": record.currency,
#             "effective_from": record.effective_from,
#             "effective_to": record.effective_to,
#             "status": record.status,
#             "created_at": record.created_at,
#             "updated_at": record.updated_at,
#             "history_date": record.history_date,
#             "category": {"id": record.category.id, "name": record.category.name} if record.category else None,
#             "country": {"id": record.country.id, "name": record.country.name} if record.country else None,
#             "supplier": {"id": record.supplier.id, "name": record.supplier.name} if record.supplier else None,
#         }
#         result.append(history_data)
# 
#     return result

@router.get("/categories/by-ids")
async def get_product_categories(
    product_ids: List[int] = Query(..., description="产品ID列表"),
    db: Session = Depends(deps.get_db),
):
    """
    获取指定产品ID列表的分类信息
    """
    try:
        if not product_ids:
            return []

        products = (
            db.query(ProductModel)
            .options(
                joinedload(ProductModel.category),
                joinedload(ProductModel.supplier)
            )
            .filter(ProductModel.id.in_(product_ids))
            .all()
        )

        result = []
        for product in products:
            result.append({
                "product_id": product.id,
                "product_name": product.product_name_en,
                "product_code": product.code,
                "category": {
                    "id": product.category.id if product.category else None,
                    "name": product.category.name if product.category else "未分类"
                },
                "supplier": {
                    "id": product.supplier.id if product.supplier else None,
                    "name": product.supplier.name if product.supplier else None
                }
            })

        # 记录日志而不是打印敏感信息
        import logging
        logging.info(f"获取了 {len(result)} 个产品的分类信息")
        return result
    except Exception as e:
        import logging
        logging.error(f"获取产品分类信息失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="获取产品分类信息失败"
        )

@router.post("/supplier-mappings", response_model=Dict[str, Dict])
def get_product_supplier_mappings(
    product_ids: List[int],
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_active_user),
):
    """
    获取产品与供应商的映射关系。
    返回两种映射:
    1. direct: 直接与产品关联的供应商（当前供应商、历史供应商、产品历史记录中的供应商）
    2. category: 基于产品类别匹配的供应商
    """
    try:
        # 初始化结果结构
        result = {
            "direct": {},    # 直接映射
            "category": {}   # 类别映射
        }

        # 获取所有请求的产品和所有活跃的供应商
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        suppliers = db.query(Supplier).filter(Supplier.status == True).all()

        print(f"找到 {len(products)} 个产品和 {len(suppliers)} 个供应商进行匹配")

        # 构建类别ID到供应商的映射
        category_suppliers = {}
        for supplier in suppliers:
            for category in supplier.categories:
                if category.id not in category_suppliers:
                    category_suppliers[category.id] = []
                category_suppliers[category.id].append({
                    "id": supplier.id,
                    "name": supplier.name,
                    "match_type": "category"
                })

        # 批量查询优化 - 避免N+1查询问题
        product_ids = [p.id for p in products]

        # 批量获取订单项历史供应商
        all_order_items = db.query(OrderItem).filter(
            OrderItem.product_id.in_(product_ids)
        ).order_by(OrderItem.created_at.desc()).all()

        # ProductHistory 功能已移除 - 以下代码已禁用
        # all_product_history = db.query(ProductHistory).filter(
        #     ProductHistory.product_id.in_(product_ids)
        # ).order_by(ProductHistory.history_date.desc()).all()

        # 按product_id分组
        order_items_by_product = defaultdict(list)
        for item in all_order_items:
            order_items_by_product[item.product_id].append(item)

        # history_by_product = defaultdict(list)
        # for history in all_product_history:
        #     history_by_product[history.product_id].append(history)

        # 为每个产品找到直接关联的供应商
        for product in products:
            product_id = str(product.id)
            direct_suppliers = set()  # 使用集合避免重复

            # 1. 获取产品当前供应商
            if product.supplier_id:
                direct_suppliers.add(product.supplier_id)

            # 2. 获取来自订单项的历史供应商（限制前5个）
            product_order_items = order_items_by_product.get(product.id, [])[:5]
            for item in product_order_items:
                if item.supplier_id:
                    direct_suppliers.add(item.supplier_id)

            # 3. ProductHistory 功能已移除 - 以下代码已禁用
            # product_histories = history_by_product.get(product.id, [])[:10]
            # for history in product_histories:
            #     if history.supplier_id:
            #         direct_suppliers.add(history.supplier_id)

            # 获取这些供应商的详细信息
            direct_supplier_details = []
            if direct_suppliers:
                supplier_details = db.query(Supplier).filter(
                    Supplier.id.in_(list(direct_suppliers)),
                    Supplier.status == True
                ).all()

                for supplier in supplier_details:
                    direct_supplier_details.append({
                        "id": supplier.id,
                        "name": supplier.name,
                        "match_type": "direct",
                        "is_current": supplier.id == product.supplier_id
                    })

            # 存储直接映射结果
            result["direct"][product_id] = direct_supplier_details

            # 存储类别映射结果 - 如果产品有类别
            result["category"][product_id] = []
            if product.category_id and product.category_id in category_suppliers:
                result["category"][product_id] = category_suppliers[product.category_id]

            print(f"产品 {product.product_name_en} (ID: {product.id}):")
            print(f"  - 直接匹配的供应商: {len(direct_supplier_details)}")
            print(f"  - 类别匹配的供应商: {len(result['category'][product_id])}")

        return result
    except Exception as e:
        import logging
        logging.error(f"获取产品供应商映射时出错: {str(e)}")
        # 返回一个空结果而不是抛出错误
        return {"direct": {}, "category": {}}

@router.post("/available-suppliers", response_model=Dict[str, List])
def get_available_suppliers(
    product_ids: List[int],
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_active_user),
):
    """
    获取产品的可用供应商（简化版接口）
    返回格式：{ "product_id": [供应商列表] }
    """
    try:
        result = {}

        # 获取所有请求的产品
        products = db.query(ProductModel).filter(ProductModel.id.in_(product_ids)).all()
        print(f"找到 {len(products)} 个产品进行供应商匹配")

        # 获取所有活跃的供应商
        all_suppliers = db.query(Supplier).filter(Supplier.status == True).all()
        print(f"数据库中有 {len(all_suppliers)} 个活跃供应商")

        # 构建类别ID到供应商的映射
        category_suppliers = {}
        for supplier in all_suppliers:
            for category in supplier.categories:
                if category.id not in category_suppliers:
                    category_suppliers[category.id] = []
                category_suppliers[category.id].append(supplier.id)

        # 为每个产品找到可用的供应商
        for product in products:
            product_id = str(product.id)
            available_supplier_ids = set()  # 使用集合避免重复

            # 1. 添加产品当前供应商
            if product.supplier_id:
                available_supplier_ids.add(product.supplier_id)

            # 2. 添加产品所属分类的所有供应商
            if product.category_id and product.category_id in category_suppliers:
                for supplier_id in category_suppliers[product.category_id]:
                    available_supplier_ids.add(supplier_id)

            # 获取这些供应商的详细信息
            supplier_details = []
            if available_supplier_ids:
                suppliers = db.query(Supplier).filter(
                    Supplier.id.in_(list(available_supplier_ids)),
                    Supplier.status == True
                ).all()

                for supplier in suppliers:
                    supplier_details.append({
                        "id": supplier.id,
                        "name": supplier.name,
                        "email": supplier.email,
                        "is_current": supplier.id == product.supplier_id
                    })

            result[product_id] = supplier_details
            print(f"产品 {product.product_name_en} (ID: {product.id}) 有 {len(supplier_details)} 个可用供应商")

        return result
    except Exception as e:
        print(f"获取产品可用供应商时出错: {str(e)}")
        # 返回一个空结果而不是抛出错误
        return {}

@router.post("/available-suppliers-by-code", response_model=Dict[str, List])
def get_available_suppliers_by_code(
    product_codes: List[str],
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_current_active_user),
):
    """
    通过产品代码获取产品的可用供应商（仅返回直接供应商）
    返回格式：{ "product_code": [供应商列表] }
    """
    try:
        result = {}

        # 获取所有请求的产品（通过代码查询）
        products = db.query(ProductModel).filter(ProductModel.code.in_(product_codes)).all()
        print(f"通过产品代码找到 {len(products)} 个产品进行供应商匹配")
        for product in products:
            print(f"  - 产品: {product.product_name_en}, 代码: {product.code}, ID: {product.id}")

        # 为每个产品找到直接关联的供应商
        for product in products:
            if not product.code:
                print(f"跳过没有代码的产品: {product.product_name_en} (ID: {product.id})")
                continue

            product_code = product.code

            # 获取产品的直接供应商
            supplier_details = []

            # 只添加产品当前供应商
            if product.supplier_id:
                supplier = db.query(Supplier).filter(
                    Supplier.id == product.supplier_id,
                    Supplier.status == True
                ).first()

                if supplier:
                    supplier_details.append({
                        "id": supplier.id,
                        "name": supplier.name,
                        "email": supplier.email,
                        "is_current": True
                    })

            result[product_code] = supplier_details
            print(f"产品 {product.product_name_en} (代码: {product_code}) 有 {len(supplier_details)} 个直接供应商")

        return result
    except Exception as e:
        print(f"获取产品直接供应商时出错: {str(e)}")
        # 返回一个空结果而不是抛出错误
        return {}
