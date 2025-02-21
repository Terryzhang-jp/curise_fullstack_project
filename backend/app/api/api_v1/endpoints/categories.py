from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.category import CategoryCreate, CategoryUpdate, Category
from app.crud.crud_category import category

router = APIRouter()

@router.get("/", response_model=List[Category])
def read_categories(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取类别列表
    """
    return category.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Category)
def create_category(
    *,
    db: Session = Depends(deps.get_db),
    category_in: CategoryCreate,
) -> Any:
    """
    创建新类别
    """
    category_obj = category.get_by_code(db, code=category_in.code)
    if category_obj:
        raise HTTPException(
            status_code=400,
            detail="该类别代码已存在",
        )
    return category.create(db, obj_in=category_in)

@router.put("/{category_id}", response_model=Category)
def update_category(
    *,
    db: Session = Depends(deps.get_db),
    category_id: int,
    category_in: CategoryUpdate,
) -> Any:
    """
    更新类别信息
    """
    category_obj = category.get(db, id=category_id)
    if not category_obj:
        raise HTTPException(
            status_code=404,
            detail="类别不存在",
        )
    return category.update(db, db_obj=category_obj, obj_in=category_in)

@router.get("/{category_id}", response_model=Category)
def read_category(
    *,
    db: Session = Depends(deps.get_db),
    category_id: int,
) -> Any:
    """
    根据ID获取类别信息
    """
    category_obj = category.get(db, id=category_id)
    if not category_obj:
        raise HTTPException(
            status_code=404,
            detail="类别不存在",
        )
    return category_obj

@router.delete("/{category_id}")
def delete_category(
    *,
    db: Session = Depends(deps.get_db),
    category_id: int,
) -> Any:
    """
    删除类别
    """
    category_obj = category.get(db, id=category_id)
    if not category_obj:
        raise HTTPException(
            status_code=404,
            detail="类别不存在",
        )
    category.remove(db, id=category_id)
    return {"message": "删除成功"}
