from sqlalchemy.orm import Session
from app.models.models import EmailTemplate
from app.schemas.email_template import EmailTemplateCreate, EmailTemplateUpdate

def get_email_template(db: Session, template_id: int):
    return db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()

def get_email_templates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(EmailTemplate).offset(skip).limit(limit).all()

def create_email_template(db: Session, template: EmailTemplateCreate):
    db_template = EmailTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

def update_email_template(db: Session, template_id: int, template: EmailTemplateUpdate):
    db_template = get_email_template(db, template_id)
    if db_template:
        for key, value in template.model_dump().items():
            setattr(db_template, key, value)
        db.commit()
        db.refresh(db_template)
    return db_template

def delete_email_template(db: Session, template_id: int):
    db_template = get_email_template(db, template_id)
    if db_template:
        db.delete(db_template)
        db.commit()
        return True
    return False 