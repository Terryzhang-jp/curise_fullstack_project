from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from .country import Country
from .ship import Ship

class OrderItemBase(BaseModel):
    product_code: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    description: Optional[str] = None

class OrderBase(BaseModel):
    order_no: str
    order_date: datetime
    currency: str
    ship_code: str
    delivery_date: datetime
    notes: Optional[str] = None

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Order(OrderBase):
    id: int
    upload_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    items: List[OrderItem] = []

    class Config:
        from_attributes = True

class OrderUploadBase(BaseModel):
    file_name: str
    country_id: int
    ship_id: int

class OrderUploadCreate(OrderUploadBase):
    pass

class OrderUploadUpdate(OrderUploadBase):
    status: Optional[str] = None
    error_message: Optional[str] = None

class OrderUpload(OrderUploadBase):
    id: int
    upload_date: datetime
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    country: Optional[Country] = None
    ship: Optional[Ship] = None
    orders: List[Order] = []

    class Config:
        from_attributes = True 