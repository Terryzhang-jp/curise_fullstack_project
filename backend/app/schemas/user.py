from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime

# 基础用户模型
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: Optional[bool] = True

# 创建用户时不需要传入以下字段
class UserCreate(UserBase):
    password: str
    role: str = "user"  # "superadmin", "admin", "user"

# 更新用户时不需要更新密码
class UserUpdate(UserBase):
    password: Optional[str] = None
    role: Optional[str] = None

# 用于返回的用户信息
class User(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# 用于用户登录的数据
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Token响应
class Token(BaseModel):
    access_token: str
    token_type: str

# Token中的载荷
class TokenPayload(BaseModel):
    sub: Optional[int] = None
    role: Optional[str] = None 