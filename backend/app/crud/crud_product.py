from typing import List, Optional, Any, Union, Dict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.crud.base import CRUDBase
from app.models.models import Product
from app.schemas.product import ProductCreate, ProductUpdate
from fastapi.encoders import jsonable_encoder

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    def get_by_code(self, db: Session, *, code: str) -> Optional[Product]:
        return db.query(Product).filter(Product.code == code).first()

    def get_by_code_and_country(
        self, db: Session, *, code: str, country_id: int
    ) -> Optional[Product]:
        """根据产品代码和国家ID查询产品，支持同一产品代码在不同国家存在"""
        return db.query(Product).filter(
            Product.code == code,
            Product.country_id == country_id
        ).first()

    def get_by_name_and_country(
        self, db: Session, *, name: str, country_id: int
    ) -> Optional[Product]:
        """查询产品，支持通过name和product_name_en字段查找"""
        return db.query(Product).filter(
            Product.product_name_en == name,
            Product.country_id == country_id
        ).first()

    def get_by_unique_constraint(
        self, db: Session, *, country_id: int, product_name_en: str, port_id: Optional[int] = None
    ) -> Optional[Product]:
        """根据数据库唯一约束检查产品是否存在: country_id + product_name_en + port_id"""
        query = db.query(Product).filter(
            Product.country_id == country_id,
            Product.product_name_en == product_name_en
        )

        if port_id is not None:
            query = query.filter(Product.port_id == port_id)
        else:
            query = query.filter(Product.port_id.is_(None))

        return query.first()

    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 10000
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
        self, db: Session, *, category_id: int, skip: int = 0, limit: int = 10000
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
        self, db: Session, *, country_id: int, skip: int = 0, limit: int = 10000
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

    def get_multi_with_filters(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 10000,
        category_id: Optional[int] = None,
        country_id: Optional[int] = None,
        port_id: Optional[int] = None
    ) -> List[Product]:
        """
        获取产品列表，支持多重筛选
        """
        query = db.query(Product).options(
            joinedload(Product.category),
            joinedload(Product.country),
            joinedload(Product.supplier),
            joinedload(Product.port)  # 添加港口关联
        )

        # 应用筛选条件
        if category_id is not None:
            query = query.filter(Product.category_id == category_id)

        if country_id is not None:
            query = query.filter(Product.country_id == country_id)

        if port_id is not None:
            query = query.filter(Product.port_id == port_id)

        return query.offset(skip).limit(limit).all()

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
        product_name_en: Optional[str] = None,
        code: Optional[str] = None,
        category_id: Optional[int] = None,
        country_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 10000,
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

        # 优先使用product_name_en，如果没有则尝试使用name参数兼容旧代码
        search_name = product_name_en or name
        if search_name:
            query = query.filter(Product.product_name_en.ilike(f"%{search_name}%"))

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
            name_country_key = (product.product_name_en, product.country_id)
            if name_country_key in seen_names:
                duplicates.append({
                    "type": "name_country",
                    "product1": seen_names[name_country_key],
                    "product2": product
                })
            else:
                seen_names[name_country_key] = product

            # 检查代码重复（同一国家内）
            if product.code:
                code_country_key = (product.code, product.country_id)
                if code_country_key in seen_codes:
                    duplicates.append({
                        "type": "code_country",
                        "product1": seen_codes[code_country_key],
                        "product2": product
                    })
                else:
                    seen_codes[code_country_key] = product

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
        try:
            # 直接更新产品数据，不创建历史记录
            obj_data = jsonable_encoder(db_obj)
            if isinstance(obj_in, dict):
                update_data = obj_in.copy()
            else:
                update_data = obj_in.dict(exclude_unset=True)

            # 处理country_of_origin字段
            if 'country_of_origin' in update_data and update_data['country_of_origin'] is not None:
                country_value = update_data['country_of_origin']
                # 如果已经是整数，直接使用
                if isinstance(country_value, int):
                    pass
                # 如果是字符串，保留原始值
                # 这样可以保存国家名称而不是ID，更直观且避免ID变化带来的问题
                elif isinstance(country_value, str) and country_value:
                    # 保留字符串值，不做转换
                    pass
                else:
                    # 其他情况设为null
                    update_data['country_of_origin'] = None

            # 确保status是布尔值
            if 'status' in update_data and update_data['status'] is not None:
                if isinstance(update_data['status'], str):
                    update_data['status'] = update_data['status'].lower() == 'true'

            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])

            # 更新产品
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj

        except Exception as e:
            db.rollback()
            raise e

    def create(
        self,
        db: Session,
        *,
        obj_in: Union[ProductCreate, Dict[str, Any]]
    ) -> Product:
        """
        重写创建方法，处理传入数据的类型转换
        """
        if isinstance(obj_in, dict):
            create_data = obj_in.copy()
        else:
            create_data = obj_in.dict(exclude_unset=True)

        # 处理status字段，确保是布尔值
        if 'status' in create_data and create_data['status'] is not None:
            if isinstance(create_data['status'], str):
                create_data['status'] = create_data['status'].lower() == 'true'

        # 处理country_of_origin字段
        if 'country_of_origin' in create_data and create_data['country_of_origin'] is not None:
            country_value = create_data['country_of_origin']
            # 如果已经是整数，直接使用
            if isinstance(country_value, int):
                pass
            # 如果是字符串，保留原始值
            # 这样可以保存国家名称而不是ID，更直观且避免ID变化带来的问题
            elif isinstance(country_value, str) and country_value:
                # 保留字符串值，不做转换
                pass
            else:
                # 其他情况设为null
                create_data['country_of_origin'] = None

        # 调用父类的创建方法
        return super().create(db, obj_in=create_data)

product = CRUDProduct(Product)