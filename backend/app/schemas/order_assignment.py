from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class OrderAssignmentItemCreate(BaseModel):
    analysis_item_id: int
    quantity: Decimal
    unit_price: Decimal

class OrderAssignmentCreate(BaseModel):
    supplier_id: int
    items: List[OrderAssignmentItemCreate]

class OrderAssignmentItem(OrderAssignmentItemCreate):
    id: int
    status: str
    notification_sent: Optional[datetime] = None
    notification_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OrderAssignment(BaseModel):
    id: int
    supplier_id: int
    items: List[OrderAssignmentItem]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 