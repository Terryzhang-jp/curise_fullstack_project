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

class OrderItemBase(BaseModel):
    product_id: Optional[int] = None
    supplier_id: Optional[int] = None
    quantity: Decimal
    price: Decimal
    total: Decimal
    status: str = "pending"
    order_id: int

class OrderItem(OrderItemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductInfo] = None
    supplier: Optional[SupplierInfo] = None
    order: Optional[OrderInfo] = None

    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    order_no: str
    ship_id: int
    company_id: int
    port_id: int
    order_date: datetime
    delivery_date: datetime
    status: str = "draft"  # draft, pending, completed, cancelled
    total_amount: float
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemBase]

class OrderUpdate(BaseModel):
    ship_id: Optional[int] = None
    company_id: Optional[int] = None
    port_id: Optional[int] = None
    order_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    status: Optional[str] = None
    total_amount: Optional[float] = None
    notes: Optional[str] = None

class Order(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ship: Optional[ShipInfo] = None
    company: Optional[CompanyInfo] = None
    port: Optional[PortInfo] = None
    order_items: List[OrderItem] = []

    class Config:
        from_attributes = True
 