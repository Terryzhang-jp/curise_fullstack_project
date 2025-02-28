from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any

from app.api import deps
from app import crud
from app.core.security import create_access_token
from app.schemas.user import Token, UserCreate, User
from app.crud.crud_user import user
from app.core.config import settings
from datetime import timedelta

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    获取OAuth2兼容的token
    """
    # 认证用户
    user_obj = user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active(user_obj):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户未激活",
        )
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            subject=user_obj.id, role=user_obj.role, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=User)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_admin_user)
) -> Any:
    """
    创建新用户（需要管理员权限）
    """
    # 检查用户是否有创建该角色的权限
    if current_user.role == "admin" and user_in.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理员不能创建超级管理员账号"
        )
    
    # 检查邮箱是否已注册
    existing_user = user.get_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已注册"
        )
    
    # 创建用户
    return user.create(db, obj_in=user_in)

@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(deps.get_current_active_user)) -> Any:
    """
    获取当前用户信息
    """
    return current_user 