from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List

from app.api import deps
from app.schemas.user import User, UserCreate, UserUpdate
from app.crud.crud_user import user
from app.models.models import User as UserModel

router = APIRouter()

@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(deps.get_admin_user),
) -> Any:
    """
    获取所有用户（管理员权限）
    """
    users = user.get_multi(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: UserModel = Depends(deps.get_admin_user),
) -> Any:
    """
    创建新用户（管理员权限）
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
    
    return user.create(db, obj_in=user_in)

@router.get("/{user_id}", response_model=User)
def read_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: UserModel = Depends(deps.get_admin_user),
) -> Any:
    """
    获取特定用户信息（管理员权限）
    """
    user_obj = user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    return user_obj

@router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: UserModel = Depends(deps.get_admin_user),
) -> Any:
    """
    更新用户信息（管理员权限）
    """
    user_obj = user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 检查权限
    if current_user.role == "admin" and (user_obj.role == "superadmin" or user_in.role == "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理员不能修改超级管理员账号或将用户提升为超级管理员"
        )
    
    return user.update(db, db_obj=user_obj, obj_in=user_in)

@router.delete("/{user_id}", response_model=User)
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: UserModel = Depends(deps.get_superadmin_user),
) -> Any:
    """
    删除用户（仅超级管理员）
    """
    user_obj = user.get(db, id=user_id)
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 防止删除自己
    if user_obj.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账号"
        )
    
    return user.remove(db, id=user_id) 