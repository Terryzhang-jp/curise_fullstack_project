from typing import Optional
from pydantic import BaseModel
from datetime import datetime

# 共享属性
class CategoryBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[bool] = True

# 创建时的属性
class CategoryCreate(CategoryBase):
    pass

# 更新时的属性
class CategoryUpdate(CategoryBase):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    status: Optional[bool] = None

# API响应中的属性
class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 