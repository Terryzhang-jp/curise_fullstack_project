from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    content: str

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(EmailTemplateBase):
    pass

class EmailTemplate(EmailTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 