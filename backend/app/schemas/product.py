from typing import Optional, List, Union
from pydantic import BaseModel
from datetime import datetime
from .country import Country
from .category import Category
from .supplier import Supplier
from .port import Port

# 共享属性
class ProductBase(BaseModel):
    name: Optional[str] = None  # 保留原字段兼容旧代码
    product_name_en: str  # 英文名称，取代原来的name
    product_name_jp: Optional[str] = None  # 日语名称
    code: Optional[str] = None
    category_id: Optional[int] = None  # 允许为None
    country_id: Optional[int] = None  # 允许为None
    supplier_id: Optional[int] = None
    port_id: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[float] = 0.0
    unit_size: Optional[str] = None  # 单位重量，如"450g"
    pack_size: Optional[str] = None  # 包装数量，支持字符串格式如"30个", "1箱"
    country_of_origin: Optional[Union[int, str]] = None  # 原产国ID
    brand: Optional[str] = None  # 品牌
    currency: Optional[str] = None  # 货币类型
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    status: Optional[bool] = True

# 创建时的属性
class ProductCreate(ProductBase):
    product_name_en: str  # 英文名称必填
    category_id: int  # 创建时必须提供分类ID
    country_id: int  # 创建时必须提供国家ID

# 更新时的属性
class ProductUpdate(ProductBase):
    name: Optional[str] = None
    product_name_en: Optional[str] = None
    product_name_jp: Optional[str] = None
    code: Optional[str] = None
    category_id: Optional[int] = None
    country_id: Optional[int] = None
    supplier_id: Optional[int] = None
    port_id: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    unit_size: Optional[str] = None
    pack_size: Optional[str] = None  # 改为字符串类型
    country_of_origin: Optional[Union[int, str]] = None  # 接受整数或字符串
    brand: Optional[str] = None
    currency: Optional[str] = None
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
    port: Optional[Port] = None

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