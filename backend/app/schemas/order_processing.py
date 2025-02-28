from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class OrderProcessingItemBase(BaseModel):
    order_item_id: Optional[int] = None  # 可以为空，因为可能是临时项

class OrderProcessingItemCreate(OrderProcessingItemBase):
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity: float
    price: float
    total: float
    order_no: str
    ship_name: Optional[str] = None
    supplier_name: Optional[str] = None

class OrderProcessingItemUpdate(BaseModel):
    status: Optional[str] = None
    processed_at: Optional[datetime] = None

class OrderProcessingItemResponse(BaseModel):
    id: int
    user_id: int
    order_item_id: Optional[int] = None
    order_no: str
    ship_name: Optional[str] = None
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    supplier_name: Optional[str] = None
    quantity: float
    price: float
    total: float
    status: str
    added_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True 