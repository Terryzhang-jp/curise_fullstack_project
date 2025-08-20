#!/usr/bin/env python3
"""
邮件配置相关的Pydantic模型
用于API请求和响应的数据验证
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator

class EmailConfigBase(BaseModel):
    """邮件配置基础模型"""
    config_name: str = Field(..., min_length=1, max_length=100, description="配置名称")
    config_type: str = Field(default="gmail", description="配置类型")
    is_active: bool = Field(default=False, description="是否启用")
    is_default: bool = Field(default=False, description="是否为默认配置")
    
    # Gmail配置
    gmail_address: Optional[EmailStr] = Field(None, description="Gmail邮箱地址")
    sender_name: Optional[str] = Field(None, max_length=100, description="发件人显示名称")
    
    # SMTP配置
    smtp_host: str = Field(default="smtp.gmail.com", max_length=100, description="SMTP服务器地址")
    smtp_port: int = Field(default=587, ge=1, le=65535, description="SMTP端口")
    use_tls: bool = Field(default=True, description="是否使用TLS")
    use_ssl: bool = Field(default=False, description="是否使用SSL")
    
    # 高级配置
    timeout: int = Field(default=30, ge=5, le=300, description="连接超时时间(秒)")
    max_retries: int = Field(default=3, ge=0, le=10, description="最大重试次数")
    
    @validator('config_type')
    def validate_config_type(cls, v):
        allowed_types = ['gmail', 'smtp']
        if v not in allowed_types:
            raise ValueError(f'配置类型必须是: {", ".join(allowed_types)}')
        return v
    
    @validator('gmail_address')
    def validate_gmail_address(cls, v, values):
        if values.get('config_type') == 'gmail' and not v:
            raise ValueError('Gmail配置必须提供Gmail邮箱地址')
        return v

class EmailConfigCreate(EmailConfigBase):
    """创建邮件配置的请求模型"""
    gmail_app_password: Optional[str] = Field(None, description="Gmail App Password")
    
    @validator('gmail_app_password')
    def validate_gmail_app_password(cls, v, values):
        if values.get('config_type') == 'gmail' and not v:
            raise ValueError('Gmail配置必须提供App Password')
        return v

class EmailConfigUpdate(BaseModel):
    """更新邮件配置的请求模型"""
    config_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    
    # Gmail配置
    gmail_address: Optional[EmailStr] = None
    gmail_app_password: Optional[str] = None
    sender_name: Optional[str] = Field(None, max_length=100)
    
    # SMTP配置
    smtp_host: Optional[str] = Field(None, max_length=100)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    
    # 高级配置
    timeout: Optional[int] = Field(None, ge=5, le=300)
    max_retries: Optional[int] = Field(None, ge=0, le=10)

class EmailConfigResponse(EmailConfigBase):
    """邮件配置响应模型"""
    id: int
    
    # 测试信息
    last_test_at: Optional[datetime] = None
    last_test_result: Optional[bool] = None
    last_test_error: Optional[str] = None
    
    # 统计信息
    emails_sent: int = 0
    last_used_at: Optional[datetime] = None
    
    # 审计字段
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    
    # 计算字段
    display_name: str
    
    class Config:
        from_attributes = True

class EmailConfigList(BaseModel):
    """邮件配置列表响应模型"""
    configs: list[EmailConfigResponse]
    total: int
    active_config: Optional[EmailConfigResponse] = None

class EmailTestRequest(BaseModel):
    """邮件测试请求模型"""
    test_email: EmailStr = Field(..., description="测试邮件接收地址")
    subject: str = Field(default="邮件配置测试", max_length=200, description="邮件主题")
    message: str = Field(default="这是一封测试邮件，用于验证邮件配置是否正常工作。", description="邮件内容")

class EmailTestResponse(BaseModel):
    """邮件测试响应模型"""
    success: bool
    message: str
    test_time: datetime
    error_details: Optional[str] = None

class GmailConfigQuickSetup(BaseModel):
    """Gmail快速配置模型"""
    gmail_address: EmailStr = Field(..., description="Gmail邮箱地址")
    gmail_app_password: str = Field(..., min_length=16, max_length=16, description="Gmail App Password")
    sender_name: str = Field(..., min_length=1, max_length=100, description="发件人显示名称")
    set_as_default: bool = Field(default=True, description="设置为默认配置")
    
    @validator('gmail_app_password')
    def validate_app_password_format(cls, v):
        # Gmail App Password 通常是16位字符，包含字母和数字
        if len(v) != 16:
            raise ValueError('Gmail App Password 必须是16位字符')
        if not v.replace(' ', '').isalnum():
            raise ValueError('Gmail App Password 只能包含字母、数字和空格')
        return v.replace(' ', '')  # 移除空格

class EmailConfigStats(BaseModel):
    """邮件配置统计信息"""
    total_configs: int
    active_configs: int
    gmail_configs: int
    smtp_configs: int
    total_emails_sent: int
    last_email_sent: Optional[datetime] = None
