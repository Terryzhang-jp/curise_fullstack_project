from typing import Optional
from pydantic import BaseModel
from datetime import datetime

# Shared properties
class CountryBase(BaseModel):
    name: str
    code: str
    status: Optional[bool] = True

# Properties to receive on item creation
class CountryCreate(CountryBase):
    pass

# Properties to receive on item update
class CountryUpdate(CountryBase):
    name: Optional[str] = None
    code: Optional[str] = None
    status: Optional[bool] = None

# Properties shared by models stored in DB
class Country(CountryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
