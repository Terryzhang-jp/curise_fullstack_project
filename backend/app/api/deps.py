from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.config import settings
from app.models.models import User
from app.crud.crud_user import user
from app.schemas.user import TokenPayload

# OAuth2密码流的token URL，与登录端点对应
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    验证并获取当前用户
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无法验证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_obj = user.get(db, id=int(token_data.sub))
    if not user_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return user_obj

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    获取当前激活的用户
    """
    if not user.is_active(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="用户未激活")
    return current_user

def get_superadmin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    获取超级管理员用户
    """
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="权限不足，需要超级管理员权限"
        )
    return current_user

def get_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    获取管理员（包括超级管理员）用户
    """
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="权限不足，需要管理员权限"
        )
    return current_user 