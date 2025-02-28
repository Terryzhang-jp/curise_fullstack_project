from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class ProductInfo(BaseModel):
    id: int
    name: str
    code: Optional[str] = None

    class Config:
        from_attributes = True

class SupplierInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class ShipInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class CompanyInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class PortInfo(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class OrderInfo(BaseModel):
    id: int
    order_no: str
    ship: Optional[ShipInfo] = None

    class Config:
        from_attributes = True

class PendingOrderResponse(BaseModel):
    id: int
    order_id: int
    order_no: Optional[str] = None
    ship_name: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    supplier_name: Optional[str] = None
    quantity: float
    price: float
    total: float
    status: str

class OrderStatusUpdate(BaseModel):
    status: str

class SupplierMatchRequest(BaseModel):
    order_item_ids: List[int]
    supplier_ids: List[int]

class OrderItemBase(BaseModel):
    order_id: int
    product_id: int
    supplier_id: int
    quantity: float
    price: float
    total: float
    status: str = "unprocessed"

class OrderItem(OrderItemBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductInfo] = None
    supplier: Optional[SupplierInfo] = None

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    order_no: str
    ship_id: int
    company_id: int
    port_id: int
    order_date: datetime
    delivery_date: Optional[datetime] = None
    status: str = "not_started"
    total_amount: float = 0
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(OrderBase):
    pass

class Order(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ship: Optional[ShipInfo] = None
    company: Optional[CompanyInfo] = None
    port: Optional[PortInfo] = None
    order_items: Optional[List[OrderItem]] = None

    class Config:
        from_attributes = True
 