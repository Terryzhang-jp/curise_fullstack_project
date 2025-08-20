from typing import List, Optional, Dict, Union, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from app.crud.base import CRUDBase
from app.models.models import Supplier, Category, SupplierCategory
from app.schemas.supplier import SupplierCreate, SupplierUpdate

class CRUDSupplier(CRUDBase[Supplier, SupplierCreate, SupplierUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Supplier]:
        return db.query(Supplier).filter(Supplier.name == name).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Supplier]:
        return (
            db.query(Supplier)
            .options(
                joinedload(Supplier.country),
                joinedload(Supplier.categories)
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_category(
        self, db: Session, *, category_id: int, skip: int = 0, limit: int = 100
    ) -> List[Supplier]:
        return (
            db.query(Supplier)
            .join(Supplier.categories)
            .filter(Category.id == category_id)
            .options(
                joinedload(Supplier.country),
                joinedload(Supplier.categories)
            )
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def create(
        self, db: Session, *, obj_in: SupplierCreate
    ) -> Supplier:
        db_obj = Supplier(
            name=obj_in.name,
            country_id=obj_in.country_id,
            contact=obj_in.contact,
            email=obj_in.email,
            phone=obj_in.phone,
            status=obj_in.status
        )
        
        # 如果提供了类别ID列表，添加类别关联
        if hasattr(obj_in, 'category_ids') and obj_in.category_ids:
            categories = db.query(Category).filter(
                Category.id.in_(obj_in.category_ids)
            ).all()
            db_obj.categories = categories
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: Supplier, obj_in: SupplierUpdate
    ) -> Supplier:
        update_data = obj_in.dict(exclude_unset=True)
        
        # 如果提供了类别ID列表，更新类别关联
        if 'category_ids' in update_data:
            category_ids = update_data.pop('category_ids', [])
            if category_ids:
                categories = db.query(Category).filter(
                    Category.id.in_(category_ids)
                ).all()
                db_obj.categories = categories
            else:
                db_obj.categories = []
        
        # 更新其他字段
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get(self, db: Session, id: Any) -> Optional[Supplier]:
        return (
            db.query(Supplier)
            .options(
                joinedload(Supplier.country),
                joinedload(Supplier.categories)
            )
            .filter(Supplier.id == id)
            .first()
        )

    def update_categories(
        self, db: Session, *, supplier_id: int, category_ids: List[int]
    ) -> Supplier:
        """
        更新供应商的类别关联
        """
        supplier = self.get(db, id=supplier_id)
        if not supplier:
            raise ValueError("供应商不存在")
        
        try:
            # 验证所有类别是否存在
            categories = db.query(Category).filter(Category.id.in_(category_ids)).all()
            if len(categories) != len(category_ids):
                raise ValueError("某些类别不存在")
            
            # 更新类别关联
            supplier.categories = categories
            
            db.add(supplier)
            db.commit()
            db.refresh(supplier)
            
            return supplier
            
        except Exception as e:
            db.rollback()
            raise ValueError(f"更新类别失败: {str(e)}")

    def get_multi_with_categories(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Supplier]:
        """
        获取供应商列表，同时加载类别关联
        """
        return db.query(self.model)\
            .options(
                joinedload(self.model.country),
                joinedload(self.model.categories)
            )\
            .offset(skip)\
            .limit(limit)\
            .all()

supplier = CRUDSupplier(Supplier) 