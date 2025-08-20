from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.models import Port
from app.schemas.port import PortCreate, PortUpdate
import logging

logger = logging.getLogger(__name__)

class CRUDPort(CRUDBase[Port, PortCreate, PortUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Port]:
        return db.query(Port).filter(Port.name == name).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, country_id: Optional[int] = None
    ) -> List[Port]:
        query = db.query(Port).options(joinedload(Port.country))
        
        if country_id is not None:
            query = query.filter(Port.country_id == country_id)
        
        ports = query.offset(skip).limit(limit).all()
        logger.info(f"获取港口列表: {[{'id': p.id, 'name': p.name, 'location': p.location} for p in ports]}")
        return ports

    def update(
        self, db: Session, *, db_obj: Port, obj_in: PortUpdate
    ) -> Port:
        logger.info(f"更新港口，ID: {db_obj.id}, 更新数据: {obj_in.dict(exclude_unset=True)}")
        try:
            # 开始事务
            result = super().update(db, db_obj=db_obj, obj_in=obj_in)
            # 刷新对象
            db.refresh(result)
            logger.info(f"更新后的港口数据: {{'id': {result.id}, 'name': '{result.name}', 'location': '{result.location}'}}")
            return result
        except Exception as e:
            logger.error(f"更新港口失败，ID: {db_obj.id}, 错误: {str(e)}")
            db.rollback()
            raise

port = CRUDPort(Port) 