from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.crud import email_template
from app.schemas.email_template import EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate

router = APIRouter()

@router.get("/", response_model=List[EmailTemplate])
def read_email_templates(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    """获取所有邮件模板"""
    templates = email_template.get_email_templates(db, skip=skip, limit=limit)
    return templates

@router.post("/", response_model=EmailTemplate)
def create_email_template(
    template: EmailTemplateCreate,
    db: Session = Depends(deps.get_db),
):
    """创建新的邮件模板"""
    return email_template.create_email_template(db=db, template=template)

@router.get("/{template_id}", response_model=EmailTemplate)
def read_email_template(
    template_id: int,
    db: Session = Depends(deps.get_db),
):
    """获取特定邮件模板"""
    db_template = email_template.get_email_template(db, template_id=template_id)
    if db_template is None:
        raise HTTPException(status_code=404, detail="邮件模板不存在")
    return db_template

@router.put("/{template_id}", response_model=EmailTemplate)
def update_email_template(
    template_id: int,
    template: EmailTemplateUpdate,
    db: Session = Depends(deps.get_db),
):
    """更新邮件模板"""
    db_template = email_template.update_email_template(
        db=db, template_id=template_id, template=template
    )
    if db_template is None:
        raise HTTPException(status_code=404, detail="邮件模板不存在")
    return db_template

@router.delete("/{template_id}")
def delete_email_template(
    template_id: int,
    db: Session = Depends(deps.get_db),
):
    """删除邮件模板"""
    success = email_template.delete_email_template(db=db, template_id=template_id)
    if not success:
        raise HTTPException(status_code=404, detail="邮件模板不存在")
    return {"message": "邮件模板已删除"} 