from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.ship import ShipCreate, ShipUpdate, Ship
from app.crud.crud_ship import ship

router = APIRouter()

@router.get("/", response_model=List[Ship])
def read_ships(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = None,
) -> Any:
    """
    获取船舶列表
    """
    if company_id:
        return ship.get_by_company(db, company_id=company_id, skip=skip, limit=limit)
    return ship.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Ship)
def create_ship(
    *,
    db: Session = Depends(deps.get_db),
    ship_in: ShipCreate,
) -> Any:
    """
    创建新船舶
    """
    ship_obj = ship.get_by_name(db, name=ship_in.name)
    if ship_obj:
        raise HTTPException(
            status_code=400,
            detail="该船舶名称已存在",
        )
    return ship.create(db, obj_in=ship_in)

@router.put("/{ship_id}", response_model=Ship)
def update_ship(
    *,
    db: Session = Depends(deps.get_db),
    ship_id: int,
    ship_in: ShipUpdate,
) -> Any:
    """
    更新船舶信息
    """
    ship_obj = ship.get(db, id=ship_id)
    if not ship_obj:
        raise HTTPException(
            status_code=404,
            detail="船舶不存在",
        )
    return ship.update(db, db_obj=ship_obj, obj_in=ship_in)

@router.get("/{ship_id}", response_model=Ship)
def read_ship(
    *,
    db: Session = Depends(deps.get_db),
    ship_id: int,
) -> Any:
    """
    根据ID获取船舶信息
    """
    ship_obj = ship.get(db, id=ship_id)
    if not ship_obj:
        raise HTTPException(
            status_code=404,
            detail="船舶不存在",
        )
    return ship_obj

@router.delete("/{ship_id}")
def delete_ship(
    *,
    db: Session = Depends(deps.get_db),
    ship_id: int,
) -> Any:
    """
    删除船舶
    """
    ship_obj = ship.get(db, id=ship_id)
    if not ship_obj:
        raise HTTPException(
            status_code=404,
            detail="船舶不存在",
        )
    ship.remove(db, id=ship_id)
    return {"message": "删除成功"}
