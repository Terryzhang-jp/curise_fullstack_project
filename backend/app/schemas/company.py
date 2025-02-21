from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from .country import Country

# 共享属性
class CompanyBase(BaseModel):
    name: str
    country_id: int
    contact: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[bool] = True

# 创建时的属性
class CompanyCreate(CompanyBase):
    pass

# 更新时的属性
class CompanyUpdate(CompanyBase):
    name: Optional[str] = None
    country_id: Optional[int] = None
    contact: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[bool] = None

# API响应中的属性
class Company(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    country: Optional[Country] = None

    class Config:
        from_attributes = True 