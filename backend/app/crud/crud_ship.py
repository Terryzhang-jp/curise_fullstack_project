from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.models import Ship
from app.schemas.ship import ShipCreate, ShipUpdate

class CRUDShip(CRUDBase[Ship, ShipCreate, ShipUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> Optional[Ship]:
        return db.query(Ship).filter(Ship.name == name).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Ship]:
        return db.query(Ship).options(
            joinedload(Ship.company)
        ).offset(skip).limit(limit).all()
    
    def get_by_company(
        self, db: Session, *, company_id: int, skip: int = 0, limit: int = 100
    ) -> List[Ship]:
        return db.query(Ship).options(
            joinedload(Ship.company)
        ).filter(Ship.company_id == company_id).offset(skip).limit(limit).all()

ship = CRUDShip(Ship) 