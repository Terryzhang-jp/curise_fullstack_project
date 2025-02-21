from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class CountryInfo(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True

# 共享属性
class PortBase(BaseModel):
    name: str
    country_id: int
    location: Optional[str] = None
    status: Optional[bool] = True

# 创建时的属性
class PortCreate(PortBase):
    pass

# 更新时的属性
class PortUpdate(PortBase):
    name: Optional[str] = None
    country_id: Optional[int] = None
    location: Optional[str] = None
    status: Optional[bool] = None

# API响应中的属性
class Port(PortBase):
    id: int
    created_at: datetime
    updated_at: datetime
    country: Optional[CountryInfo] = None

    class Config:
        from_attributes = True 