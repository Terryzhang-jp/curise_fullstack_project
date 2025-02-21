from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.models import Country
from app.schemas.country import CountryCreate, CountryUpdate

class CRUDCountry(CRUDBase[Country, CountryCreate, CountryUpdate]):
    def get_by_code(self, db: Session, *, code: str) -> Optional[Country]:
        return db.query(Country).filter(Country.code == code).first()
    
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Country]:
        return db.query(Country).offset(skip).limit(limit).all()

country = CRUDCountry(Country) 