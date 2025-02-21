from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from .country import Country
from .category import Category
from .supplier import Supplier

# 共享属性
class ProductBase(BaseModel):
    name: str
    code: Optional[str] = None
    category_id: int
    country_id: int
    supplier_id: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[float] = 0.0
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    status: Optional[bool] = True

# 创建时的属性
class ProductCreate(ProductBase):
    pass

# 更新时的属性
class ProductUpdate(ProductBase):
    name: Optional[str] = None
    code: Optional[str] = None
    category_id: Optional[int] = None
    country_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    status: Optional[bool] = None

# API响应中的属性
class Product(ProductBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category: Optional[Category] = None
    country: Optional[Country] = None
    supplier: Optional[Supplier] = None

    class Config:
        from_attributes = True

class DuplicateInfo(BaseModel):
    type: str
    product1: Product
    product2: Product

    class Config:
        from_attributes = True

class CheckResult(BaseModel):
    products: List[Product]
    duplicates: List[DuplicateInfo]

    class Config:
        from_attributes = True