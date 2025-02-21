from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.port import PortCreate, PortUpdate, Port
from app.crud.crud_port import port

router = APIRouter()

@router.get("/", response_model=List[Port])
def read_ports(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    获取港口列表
    """
    return port.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=Port)
def create_port(
    *,
    db: Session = Depends(deps.get_db),
    port_in: PortCreate,
) -> Any:
    """
    创建新港口
    """
    return port.create(db, obj_in=port_in)

@router.put("/{port_id}", response_model=Port)
def update_port(
    *,
    db: Session = Depends(deps.get_db),
    port_id: int,
    port_in: PortUpdate,
) -> Any:
    """
    更新港口信息
    """
    port_obj = port.get(db, id=port_id)
    if not port_obj:
        raise HTTPException(
            status_code=404,
            detail="港口不存在",
        )
    return port.update(db, db_obj=port_obj, obj_in=port_in)

@router.get("/{port_id}", response_model=Port)
def read_port(
    *,
    db: Session = Depends(deps.get_db),
    port_id: int,
) -> Any:
    """
    根据ID获取港口信息
    """
    port_obj = port.get(db, id=port_id)
    if not port_obj:
        raise HTTPException(
            status_code=404,
            detail="港口不存在",
        )
    return port_obj

@router.delete("/{port_id}")
def delete_port(
    *,
    db: Session = Depends(deps.get_db),
    port_id: int,
) -> Any:
    """
    删除港口
    """
    port_obj = port.get(db, id=port_id)
    if not port_obj:
        raise HTTPException(
            status_code=404,
            detail="港口不存在",
        )
    port.remove(db, id=port_id)
    return {"message": "删除成功"} 