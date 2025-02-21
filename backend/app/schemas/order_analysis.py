from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from .product import Product
from .category import Category

class OrderAnalysisItemBase(BaseModel):
    product_code: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    description: str
    matched_product_id: Optional[int] = None
    category_id: Optional[int] = None

class OrderAnalysisItemCreate(OrderAnalysisItemBase):
    analysis_id: int

class OrderAnalysisItem(OrderAnalysisItemBase):
    id: int
    analysis_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderAnalysisBase(BaseModel):
    order_no: str
    order_date: datetime
    currency: str
    ship_code: str
    delivery_date: datetime
    supplier_info: Optional[str] = None
    notes: Optional[str] = None

class OrderAnalysisCreate(OrderAnalysisBase):
    upload_id: int

class OrderAnalysis(OrderAnalysisBase):
    id: int
    upload_id: int
    created_at: datetime
    updated_at: datetime
    items: List[OrderAnalysisItem] = []

    class Config:
        from_attributes = True 