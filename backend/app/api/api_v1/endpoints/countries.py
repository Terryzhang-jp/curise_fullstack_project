from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.country import CountryCreate, CountryUpdate, Country
from app.crud.crud_country import country

router = APIRouter()

@router.get("/", response_model=List[Country])
def read_countries(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取国家列表
    """
    return country.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Country)
def create_country(
    *,
    db: Session = Depends(deps.get_db),
    country_in: CountryCreate,
) -> Any:
    """
    创建新国家
    """
    country_obj = country.get_by_code(db, code=country_in.code)
    if country_obj:
        raise HTTPException(
            status_code=400,
            detail="该国家代码已存在",
        )
    return country.create(db, obj_in=country_in)

@router.put("/{country_id}", response_model=Country)
def update_country(
    *,
    db: Session = Depends(deps.get_db),
    country_id: int,
    country_in: CountryUpdate,
) -> Any:
    """
    更新国家信息
    """
    country_obj = country.get(db, id=country_id)
    if not country_obj:
        raise HTTPException(
            status_code=404,
            detail="国家不存在",
        )
    return country.update(db, db_obj=country_obj, obj_in=country_in)

@router.get("/{country_id}", response_model=Country)
def read_country(
    *,
    db: Session = Depends(deps.get_db),
    country_id: int,
) -> Any:
    """
    根据ID获取国家信息
    """
    country_obj = country.get(db, id=country_id)
    if not country_obj:
        raise HTTPException(
            status_code=404,
            detail="国家不存在",
        )
    return country_obj

@router.delete("/{country_id}")
def delete_country(
    *,
    db: Session = Depends(deps.get_db),
    country_id: int,
) -> Any:
    """
    删除国家
    """
    country_obj = country.get(db, id=country_id)
    if not country_obj:
        raise HTTPException(
            status_code=404,
            detail="国家不存在",
        )
    country.remove(db, id=country_id)
    return {"message": "删除成功"} 