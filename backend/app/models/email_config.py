#!/usr/bin/env python3
"""
邮件配置数据模型
用于存储Gmail和其他邮件服务的配置信息
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from datetime import datetime
from app.db.base_class import Base

class EmailConfig(Base):
    """邮件配置模型"""
    __tablename__ = "email_configs"

    id = Column(Integer, primary_key=True, index=True)
    
    # 配置基本信息
    config_name = Column(String(100), nullable=False, comment="配置名称")
    config_type = Column(String(20), nullable=False, default="gmail", comment="配置类型: gmail, smtp")
    is_active = Column(Boolean, default=False, comment="是否启用")
    is_default = Column(Boolean, default=False, comment="是否为默认配置")
    
    # Gmail专用配置
    gmail_address = Column(String(100), comment="Gmail邮箱地址")
    gmail_app_password = Column(Text, comment="Gmail App Password (加密存储)")
    sender_name = Column(String(100), comment="发件人显示名称")
    
    # SMTP通用配置
    smtp_host = Column(String(100), default="smtp.gmail.com", comment="SMTP服务器地址")
    smtp_port = Column(Integer, default=587, comment="SMTP端口")
    use_tls = Column(Boolean, default=True, comment="是否使用TLS")
    use_ssl = Column(Boolean, default=False, comment="是否使用SSL")
    
    # 高级配置
    timeout = Column(Integer, default=30, comment="连接超时时间(秒)")
    max_retries = Column(Integer, default=3, comment="最大重试次数")
    
    # 测试信息
    last_test_at = Column(DateTime, comment="最后测试时间")
    last_test_result = Column(Boolean, comment="最后测试结果")
    last_test_error = Column(Text, comment="最后测试错误信息")
    
    # 统计信息
    emails_sent = Column(Integer, default=0, comment="已发送邮件数量")
    last_used_at = Column(DateTime, comment="最后使用时间")
    
    # 审计字段
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    created_by = Column(Integer, comment="创建者用户ID")
    updated_by = Column(Integer, comment="更新者用户ID")
    
    def __repr__(self):
        return f"<EmailConfig(id={self.id}, name='{self.config_name}', type='{self.config_type}', active={self.is_active})>"
    
    @property
    def is_gmail(self) -> bool:
        """是否为Gmail配置"""
        return self.config_type == "gmail"
    
    @property
    def display_name(self) -> str:
        """显示名称"""
        if self.config_name:
            return self.config_name
        elif self.is_gmail and self.gmail_address:
            return f"Gmail ({self.gmail_address})"
        else:
            return f"{self.config_type.upper()} 配置"
    
    def to_dict(self, include_sensitive=False):
        """转换为字典，可选择是否包含敏感信息"""
        data = {
            "id": self.id,
            "config_name": self.config_name,
            "config_type": self.config_type,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "gmail_address": self.gmail_address,
            "sender_name": self.sender_name,
            "smtp_host": self.smtp_host,
            "smtp_port": self.smtp_port,
            "use_tls": self.use_tls,
            "use_ssl": self.use_ssl,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
            "last_test_at": self.last_test_at.isoformat() if self.last_test_at else None,
            "last_test_result": self.last_test_result,
            "last_test_error": self.last_test_error,
            "emails_sent": self.emails_sent,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "display_name": self.display_name
        }
        
        if include_sensitive:
            data["gmail_app_password"] = self.gmail_app_password
        
        return data
