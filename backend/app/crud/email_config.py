#!/usr/bin/env python3
"""
邮件配置CRUD操作
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime

from app.models.email_config import EmailConfig
from app.schemas.email_config import EmailConfigCreate, EmailConfigUpdate
from app.utils.encryption import encrypt_password, decrypt_password, is_encrypted

class EmailConfigCRUD:
    """邮件配置CRUD操作类"""
    
    def get(self, db: Session, config_id: int) -> Optional[EmailConfig]:
        """根据ID获取邮件配置"""
        return db.query(EmailConfig).filter(EmailConfig.id == config_id).first()
    
    def get_by_name(self, db: Session, config_name: str) -> Optional[EmailConfig]:
        """根据名称获取邮件配置"""
        return db.query(EmailConfig).filter(EmailConfig.config_name == config_name).first()
    
    def get_active_config(self, db: Session) -> Optional[EmailConfig]:
        """获取当前激活的邮件配置"""
        return db.query(EmailConfig).filter(
            and_(EmailConfig.is_active == True, EmailConfig.is_default == True)
        ).first()
    
    def get_all_active(self, db: Session) -> List[EmailConfig]:
        """获取所有激活的邮件配置"""
        return db.query(EmailConfig).filter(EmailConfig.is_active == True).all()
    
    def get_multi(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        config_type: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[EmailConfig]:
        """获取多个邮件配置"""
        query = db.query(EmailConfig)
        
        if config_type:
            query = query.filter(EmailConfig.config_type == config_type)
        
        if is_active is not None:
            query = query.filter(EmailConfig.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    def count(
        self, 
        db: Session,
        config_type: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """统计邮件配置数量"""
        query = db.query(EmailConfig)
        
        if config_type:
            query = query.filter(EmailConfig.config_type == config_type)
        
        if is_active is not None:
            query = query.filter(EmailConfig.is_active == is_active)
        
        return query.count()
    
    def create(self, db: Session, obj_in: EmailConfigCreate, created_by: int) -> EmailConfig:
        """创建邮件配置"""
        # 准备数据
        obj_data = obj_in.dict()
        
        # 加密密码
        if obj_data.get('gmail_app_password'):
            obj_data['gmail_app_password'] = encrypt_password(obj_data['gmail_app_password'])
        
        # 添加审计字段
        obj_data['created_by'] = created_by
        obj_data['updated_by'] = created_by
        
        # 如果设置为默认配置，先取消其他默认配置
        if obj_data.get('is_default', False):
            self._clear_default_configs(db)
        
        # 创建配置
        db_obj = EmailConfig(**obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        return db_obj
    
    def update(
        self, 
        db: Session, 
        db_obj: EmailConfig, 
        obj_in: EmailConfigUpdate,
        updated_by: int
    ) -> EmailConfig:
        """更新邮件配置"""
        obj_data = obj_in.dict(exclude_unset=True)
        
        # 加密密码
        if 'gmail_app_password' in obj_data and obj_data['gmail_app_password']:
            obj_data['gmail_app_password'] = encrypt_password(obj_data['gmail_app_password'])
        
        # 添加审计字段
        obj_data['updated_by'] = updated_by
        obj_data['updated_at'] = datetime.utcnow()
        
        # 如果设置为默认配置，先取消其他默认配置
        if obj_data.get('is_default', False):
            self._clear_default_configs(db, exclude_id=db_obj.id)
        
        # 更新字段
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        
        db.commit()
        db.refresh(db_obj)
        
        return db_obj
    
    def delete(self, db: Session, config_id: int) -> bool:
        """删除邮件配置"""
        db_obj = self.get(db, config_id)
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False
    
    def activate_config(self, db: Session, config_id: int, updated_by: int) -> Optional[EmailConfig]:
        """激活邮件配置"""
        db_obj = self.get(db, config_id)
        if not db_obj:
            return None
        
        # 先停用所有配置
        db.query(EmailConfig).update({
            EmailConfig.is_active: False,
            EmailConfig.is_default: False,
            EmailConfig.updated_by: updated_by,
            EmailConfig.updated_at: datetime.utcnow()
        })
        
        # 激活指定配置
        db_obj.is_active = True
        db_obj.is_default = True
        db_obj.updated_by = updated_by
        db_obj.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_obj)
        
        return db_obj
    
    def update_test_result(
        self, 
        db: Session, 
        config_id: int, 
        success: bool, 
        error_message: Optional[str] = None
    ) -> Optional[EmailConfig]:
        """更新测试结果"""
        db_obj = self.get(db, config_id)
        if not db_obj:
            return None
        
        db_obj.last_test_at = datetime.utcnow()
        db_obj.last_test_result = success
        db_obj.last_test_error = error_message
        
        db.commit()
        db.refresh(db_obj)
        
        return db_obj
    
    def increment_email_count(self, db: Session, config_id: int) -> Optional[EmailConfig]:
        """增加邮件发送计数"""
        db_obj = self.get(db, config_id)
        if not db_obj:
            return None
        
        db_obj.emails_sent = (db_obj.emails_sent or 0) + 1
        db_obj.last_used_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_obj)
        
        return db_obj
    
    def get_decrypted_password(self, db: Session, config_id: int) -> Optional[str]:
        """获取解密后的密码"""
        db_obj = self.get(db, config_id)
        if not db_obj or not db_obj.gmail_app_password:
            return None
        
        try:
            return decrypt_password(db_obj.gmail_app_password)
        except Exception:
            return None
    
    def _clear_default_configs(self, db: Session, exclude_id: Optional[int] = None):
        """清除其他默认配置"""
        query = db.query(EmailConfig).filter(EmailConfig.is_default == True)
        
        if exclude_id:
            query = query.filter(EmailConfig.id != exclude_id)
        
        query.update({
            EmailConfig.is_default: False,
            EmailConfig.updated_at: datetime.utcnow()
        })

# 创建全局实例
email_config = EmailConfigCRUD()
