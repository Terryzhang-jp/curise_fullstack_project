from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.port import PortCreate, PortUpdate, Port
from app.crud.crud_port import port
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[Port])
def read_ports(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    country_id: Optional[int] = None,
) -> Any:
    """
    获取港口列表
    """
    logger.info(f"获取港口列表，参数: skip={skip}, limit={limit}, country_id={country_id}")
    result = port.get_multi(db, skip=skip, limit=limit, country_id=country_id)
    logger.info(f"返回 {len(result)} 个港口")
    return result

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
    logger.info(f"更新港口，ID: {port_id}, 数据: {port_in.dict(exclude_unset=True)}")
    port_obj = port.get(db, id=port_id)
    if not port_obj:
        logger.error(f"港口不存在，ID: {port_id}")
        raise HTTPException(
            status_code=404,
            detail="港口不存在",
        )
    
    # 记录更新前的数据
    logger.info(f"更新前的港口数据: {{'id': {port_obj.id}, 'name': '{port_obj.name}', 'location': '{port_obj.location}'}}")
    
    try:
        result = port.update(db, db_obj=port_obj, obj_in=port_in)
        logger.info(f"更新成功，返回数据: {{'id': {result.id}, 'name': '{result.name}', 'location': '{result.location}'}}")
        return result
    except Exception as e:
        logger.error(f"更新港口失败: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"更新失败: {str(e)}"
        )

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