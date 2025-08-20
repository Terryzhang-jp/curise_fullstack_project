from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from .country import Country
from .category import Category

# 共享属性
class SupplierBase(BaseModel):
    name: str
    country_id: int
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: bool = True

# 创建时的属性
class SupplierCreate(SupplierBase):
    category_ids: Optional[List[int]] = None

# 更新时的属性
class SupplierUpdate(SupplierBase):
    name: Optional[str] = None
    country_id: Optional[int] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[bool] = None
    category_ids: Optional[List[int]] = None

# API响应中的属性
class Supplier(BaseModel):
    id: int
    name: str
    country_id: Optional[int] = None  # 允许为None
    contact: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    country: Optional[Country] = None
    categories: List[Category] = []

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        } 