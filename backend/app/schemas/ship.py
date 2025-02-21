from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from .company import Company

# 共享属性
class ShipBase(BaseModel):
    name: str
    company_id: int
    ship_type: Optional[str] = None
    capacity: Optional[int] = 0
    status: Optional[bool] = True

# 创建时的属性
class ShipCreate(ShipBase):
    pass

# 更新时的属性
class ShipUpdate(ShipBase):
    name: Optional[str] = None
    company_id: Optional[int] = None
    ship_type: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[bool] = None

# API响应中的属性
class Ship(ShipBase):
    id: int
    created_at: datetime
    updated_at: datetime
    company: Optional[Company] = None

    class Config:
        from_attributes = True 