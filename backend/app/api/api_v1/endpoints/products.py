from typing import List, Any, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
import pandas as pd
import io

from app import crud
from app.api import deps
from app.schemas.product import ProductCreate, ProductUpdate, Product, CheckResult
from app.models.models import ProductHistory, Product as ProductModel, Supplier, OrderItem
from app.models.models import User as UserModel

# 添加新的schema
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class ProductHistoryResponse(BaseModel):
    id: int
    name: str
    code: Optional[str]
    category_id: int
    country_id: int
    supplier_id: Optional[int]
    unit: Optional[str]
    price: Decimal
    effective_from: Optional[datetime]
    effective_to: Optional[datetime]
    status: bool
    change_type: str
    changed_at: datetime
    changed_by: Optional[str]
    
    category: Optional[dict]
    country: Optional[dict]
    supplier: Optional[dict]
    
    class Config:
        from_attributes = True

router = APIRouter()

@router.get("/", response_model=List[Product])
def read_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    country_id: Optional[int] = None,
) -> Any:
    """
    获取产品列表
    """
    if category_id:
        return crud.product.get_by_category(db, category_id=category_id, skip=skip, limit=limit)
    if country_id:
        return crud.product.get_by_country(db, country_id=country_id, skip=skip, limit=limit)
    return crud.product.get_multi(db, skip=skip, limit=limit)

@router.get("/search", response_model=List[Product])
def search_products(
    db: Session = Depends(deps.get_db),
    name: Optional[str] = None,
    code: Optional[str] = None,
    category_id: Optional[int] = None,
    country_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    搜索产品，支持按名称、代码、类别、国家和供应商搜索
    """
    print("搜索参数:")
    print(f"name: {name}, type: {type(name)}")
    print(f"code: {code}, type: {type(code)}")
    print(f"category_id: {category_id}, type: {type(category_id)}")
    print(f"country_id: {country_id}, type: {type(country_id)}")
    print(f"supplier_id: {supplier_id}, type: {type(supplier_id)}")
    
    try:
        results = crud.product.search_products(
            db,
            name=name,
            code=code,
            category_id=category_id,
            country_id=country_id,
            supplier_id=supplier_id,
            skip=skip,
            limit=limit
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

@router.post("/upload", response_model=List[Product])
async def upload_products(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    supplier_id: str = Form(...),  # 从表单数据中获取supplier_id
) -> Any:
    """
    通过Excel或CSV文件批量导入产品
    """
    try:
        supplier_id = int(supplier_id)  # 转换为整数
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="供应商ID格式不正确"
        )

    # 检查文件类型
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(
            status_code=400,
            detail="只支持.xlsx或.csv文件格式"
        )
    
    try:
        # 读取文件内容
        contents = await file.read()
        
        # 根据文件类型使用不同的方法读取
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            df = pd.read_csv(io.BytesIO(contents))
        
        # 验证必要的列是否存在
        required_columns = ['name', 'category_id', 'country_id']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"文件缺少必要的列: {', '.join(missing_columns)}"
            )
        
        # 数据类型转换和清理
        if 'status' in df.columns:
            df['status'] = df['status'].map({'TRUE': True, 'FALSE': False, '1': True, '0': False, True: True, False: False})
        else:
            df['status'] = True

        if 'price' in df.columns:
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
            df['price'] = df['price'].fillna(0.0)
        else:
            df['price'] = 0.0

        # 创建产品列表
        products = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                product_data = {
                    'name': str(row['name']).strip(),
                    'code': str(row['code']).strip() if 'code' in row and pd.notna(row['code']) else None,
                    'category_id': int(row['category_id']),
                    'country_id': int(row['country_id']),
                    'supplier_id': supplier_id,  # 使用传入的supplier_id
                    'unit': str(row['unit']).strip() if 'unit' in row and pd.notna(row['unit']) else None,
                    'price': float(row['price']) if 'price' in row and pd.notna(row['price']) else 0.0,
                    'status': bool(row['status']) if 'status' in row and pd.notna(row['status']) else True,
                    'effective_from': pd.to_datetime(row['effective_from']) if 'effective_from' in row and pd.notna(row['effective_from']) else None,
                    'effective_to': pd.to_datetime(row['effective_to']) if 'effective_to' in row and pd.notna(row['effective_to']) else None,
                }
                
                # 检查产品是否已存在
                existing_product = crud.product.get_by_name_and_country(
                    db, name=product_data['name'], country_id=product_data['country_id']
                )
                
                if existing_product:
                    # 更新现有产品
                    product = crud.product.update(
                        db, db_obj=existing_product, obj_in=product_data
                    )
                else:
                    # 创建新产品
                    product = crud.product.create(db, obj_in=ProductCreate(**product_data))
                
                products.append(product)
                
            except Exception as e:
                errors.append(f"第 {index + 2} 行处理失败: {str(e)}")
        
        if errors:
            raise HTTPException(
                status_code=400,
                detail={"message": "部分数据处理失败", "errors": errors}
            )
        
        return products
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"文件处理失败: {str(e)}"
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
    if product_in.code:
        product_obj = crud.product.get_by_code(db, code=product_in.code)
        if product_obj:
            raise HTTPException(
                status_code=400,
                detail="该产品代码已存在",
            )
    
    product_obj = crud.product.get_by_name_and_country(
        db, name=product_in.name, country_id=product_in.country_id
    )
    if product_obj:
        raise HTTPException(
            status_code=400,
            detail="该国家已存在同名产品",
        )
    return crud.product.create(db, obj_in=product_in)

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
    product_obj = crud.product.get(db, id=product_id)
    if not product_obj:
        raise HTTPException(
            status_code=404,
            detail="产品不存在",
        )
    return crud.product.update(db, db_obj=product_obj, obj_in=product_in)

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

@router.delete("/{product_id}")
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
) -> Any:
    """
    删除产品
    """
    product_obj = crud.product.get(db, id=product_id)
    if not product_obj:
        raise HTTPException(
            status_code=404,
            detail="产品不存在",
        )
    crud.product.remove(db, id=product_id)
    return {"message": "删除成功"}

@router.get("/{product_id}/history", response_model=List[ProductHistoryResponse])
def read_product_history(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
) -> Any:
    """
    获取产品的历史记录
    """
    product = crud.product.get(db, id=product_id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail="产品不存在",
        )
    
    history_records = db.query(ProductHistory)\
        .options(
            joinedload(ProductHistory.category),
            joinedload(ProductHistory.country),
            joinedload(ProductHistory.supplier)
        )\
        .filter(ProductHistory.product_id == product_id)\
        .order_by(desc(ProductHistory.changed_at))\
        .all()
    
    # 手动构建响应数据，确保关联对象被正确序列化
    result = []
    for record in history_records:
        history_data = {
            "id": record.id,
            "name": record.name,
            "code": record.code,
            "category_id": record.category_id,
            "country_id": record.country_id,
            "supplier_id": record.supplier_id,
            "unit": record.unit,
            "price": record.price,
            "effective_from": record.effective_from,
            "effective_to": record.effective_to,
            "status": record.status,
            "change_type": record.change_type,
            "changed_at": record.changed_at,
            "changed_by": record.changed_by,
            "category": {"id": record.category.id, "name": record.category.name} if record.category else None,
            "country": {"id": record.country.id, "name": record.country.name} if record.country else None,
            "supplier": {"id": record.supplier.id, "name": record.supplier.name} if record.supplier else None,
        }
        result.append(history_data)
    
    return result

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
                "product_name": product.name,
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

        print("产品分类信息:", result)
        return result
    except Exception as e:
        print(f"获取产品分类信息失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取产品分类信息失败: {str(e)}"
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
        
        # 为每个产品找到直接关联的供应商
        for product in products:
            product_id = str(product.id)
            direct_suppliers = set()  # 使用集合避免重复
            
            # 1. 获取产品当前供应商
            if product.supplier_id:
                direct_suppliers.add(product.supplier_id)
                
            # 2. 获取来自订单项的历史供应商
            order_items = db.query(OrderItem).filter(
                OrderItem.product_id == product.id
            ).order_by(OrderItem.created_at.desc()).limit(5).all()
            
            for item in order_items:
                if item.supplier_id:
                    direct_suppliers.add(item.supplier_id)
            
            # 3. 从产品历史记录中获取供应商
            product_history = db.query(ProductHistory).filter(
                ProductHistory.product_id == product.id
            ).order_by(ProductHistory.changed_at.desc()).limit(10).all()
            
            for history in product_history:
                if history.supplier_id:
                    direct_suppliers.add(history.supplier_id)
            
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
            
            print(f"产品 {product.name} (ID: {product.id}):")
            print(f"  - 直接匹配的供应商: {len(direct_supplier_details)}")
            print(f"  - 类别匹配的供应商: {len(result['category'][product_id])}")

        return result
    except Exception as e:
        print(f"获取产品供应商映射时出错: {str(e)}")
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
            print(f"产品 {product.name} (ID: {product.id}) 有 {len(supplier_details)} 个可用供应商")

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
            print(f"  - 产品: {product.name}, 代码: {product.code}, ID: {product.id}")
        
        # 为每个产品找到直接关联的供应商
        for product in products:
            if not product.code:
                print(f"跳过没有代码的产品: {product.name} (ID: {product.id})")
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
            print(f"产品 {product.name} (代码: {product_code}) 有 {len(supplier_details)} 个直接供应商")

        return result
    except Exception as e:
        print(f"获取产品直接供应商时出错: {str(e)}")
        # 返回一个空结果而不是抛出错误
        return {}
