from typing import List, Optional, Any, Union, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.crud.base import CRUDBase
from app.models.models import Product, ProductHistory
from app.schemas.product import ProductCreate, ProductUpdate
from fastapi.encoders import jsonable_encoder

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    def get_by_code(self, db: Session, *, code: str) -> Optional[Product]:
        return db.query(Product).filter(Product.code == code).first()
    
    def get_by_name_and_country(
        self, db: Session, *, name: str, country_id: int
    ) -> Optional[Product]:
        return db.query(Product).filter(
            Product.name == name,
            Product.country_id == country_id
        ).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Product]:
        return (
            db.query(Product)
            .options(
                joinedload(Product.category), 
                joinedload(Product.country),
                joinedload(Product.supplier)
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_category(
        self, db: Session, *, category_id: int, skip: int = 0, limit: int = 100
    ) -> List[Product]:
        return (
            db.query(Product)
            .options(
                joinedload(Product.category), 
                joinedload(Product.country),
                joinedload(Product.supplier)
            )
            .filter(Product.category_id == category_id)
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_country(
        self, db: Session, *, country_id: int, skip: int = 0, limit: int = 100
    ) -> List[Product]:
        return (
            db.query(Product)
            .options(
                joinedload(Product.category), 
                joinedload(Product.country),
                joinedload(Product.supplier)
            )
            .filter(Product.country_id == country_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get(self, db: Session, id: Any) -> Optional[Product]:
        return (
            db.query(Product)
            .options(
                joinedload(Product.category), 
                joinedload(Product.country),
                joinedload(Product.supplier)
            )
            .filter(Product.id == id)
            .first()
        )

    def search_products(
        self,
        db: Session,
        *,
        name: Optional[str] = None,
        code: Optional[str] = None,
        category_id: Optional[int] = None,
        country_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Product]:
        """
        搜索产品，支持按名称、代码、类别、国家和供应商搜索
        """
        query = (
            db.query(Product)
            .options(
                joinedload(Product.category),
                joinedload(Product.country),
                joinedload(Product.supplier)
            )
        )

        if name:
            query = query.filter(Product.name.ilike(f"%{name}%"))
        if code:
            query = query.filter(Product.code.ilike(f"%{code}%"))
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if country_id:
            query = query.filter(Product.country_id == country_id)
        if supplier_id:
            query = query.filter(Product.supplier_id == supplier_id)

        return query.offset(skip).limit(limit).all()

    def check_duplicates(
        self, 
        db: Session, 
        *, 
        order_by_code: bool = True,
        ascending: bool = True
    ) -> List[Product]:
        """
        检查重复产品并返回排序后的产品列表
        """
        query = db.query(Product).options(
            joinedload(Product.category), 
            joinedload(Product.country),
            joinedload(Product.supplier)
        )
        
        # 按代码排序
        if order_by_code:
            query = query.order_by(
                Product.code.asc() if ascending else Product.code.desc()
            )
        
        products = query.all()
        
        # 检查重复
        duplicates = []
        seen_names = {}
        seen_codes = {}
        
        for product in products:
            # 检查名称和国家组合的重复
            name_country_key = (product.name, product.country_id)
            if name_country_key in seen_names:
                duplicates.append({
                    "type": "name_country",
                    "product1": seen_names[name_country_key],
                    "product2": product
                })
            else:
                seen_names[name_country_key] = product
            
            # 检查代码重复
            if product.code:
                if product.code in seen_codes:
                    duplicates.append({
                        "type": "code",
                        "product1": seen_codes[product.code],
                        "product2": product
                    })
                else:
                    seen_codes[product.code] = product
        
        return {
            "products": products,
            "duplicates": duplicates
        }

    def update(
        self,
        db: Session,
        *,
        db_obj: Product,
        obj_in: Union[ProductUpdate, Dict[str, Any]]
    ) -> Product:
        # 创建历史记录
        history = ProductHistory(
            product_id=db_obj.id,
            name=db_obj.name,
            code=db_obj.code,
            category_id=db_obj.category_id,
            country_id=db_obj.country_id,
            supplier_id=db_obj.supplier_id,
            unit=db_obj.unit,
            price=db_obj.price,
            effective_from=db_obj.effective_from,
            effective_to=db_obj.effective_to,
            status=db_obj.status,
            change_type='update'
        )
        db.add(history)
        
        # 更新产品
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

product = CRUDProduct(Product) 