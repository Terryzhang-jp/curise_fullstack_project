from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.models import Port
from app.schemas.port import PortCreate, PortUpdate

class CRUDPort(CRUDBase[Port, PortCreate, PortUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Port]:
        return db.query(Port).filter(Port.name == name).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Port]:
        return (
            db.query(Port)
            .options(joinedload(Port.country))
            .offset(skip)
            .limit(limit)
            .all()
        )

port = CRUDPort(Port) 