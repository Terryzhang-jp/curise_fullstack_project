from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.company import CompanyCreate, CompanyUpdate, Company
from app.crud.crud_company import company

router = APIRouter()

@router.get("/", response_model=List[Company])
def read_companies(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取公司列表
    """
    return company.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Company)
def create_company(
    *,
    db: Session = Depends(deps.get_db),
    company_in: CompanyCreate,
) -> Any:
    """
    创建新公司
    """
    company_obj = company.get_by_name(db, name=company_in.name)
    if company_obj:
        raise HTTPException(
            status_code=400,
            detail="该公司名称已存在",
        )
    return company.create(db, obj_in=company_in)

@router.put("/{company_id}", response_model=Company)
def update_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
    company_in: CompanyUpdate,
) -> Any:
    """
    更新公司信息
    """
    company_obj = company.get(db, id=company_id)
    if not company_obj:
        raise HTTPException(
            status_code=404,
            detail="公司不存在",
        )
    return company.update(db, db_obj=company_obj, obj_in=company_in)

@router.get("/{company_id}", response_model=Company)
def read_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
) -> Any:
    """
    根据ID获取公司信息
    """
    company_obj = company.get(db, id=company_id)
    if not company_obj:
        raise HTTPException(
            status_code=404,
            detail="公司不存在",
        )
    return company_obj

@router.delete("/{company_id}")
def delete_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
) -> Any:
    """
    删除公司
    """
    company_obj = company.get(db, id=company_id)
    if not company_obj:
        raise HTTPException(
            status_code=404,
            detail="公司不存在",
        )
    company.remove(db, id=company_id)
    return {"message": "删除成功"}
