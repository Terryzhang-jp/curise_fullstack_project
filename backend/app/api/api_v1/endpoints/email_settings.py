#!/usr/bin/env python3
"""
邮件设置API端点
只有超级管理员可以访问
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api import deps
from app.models.models import User
from app.models.email_config import EmailConfig
from app.crud.email_config import email_config
from app.schemas.email_config import (
    EmailConfigCreate, 
    EmailConfigUpdate, 
    EmailConfigResponse,
    EmailConfigList,
    EmailTestRequest,
    EmailTestResponse,
    GmailConfigQuickSetup,
    EmailConfigStats
)
from app.utils.gmail_validator import gmail_validator

router = APIRouter()

@router.get("/configs", response_model=EmailConfigList)
def get_email_configs(
    skip: int = 0,
    limit: int = 100,
    config_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """获取邮件配置列表（仅超级管理员）"""
    
    configs = email_config.get_multi(
        db=db, 
        skip=skip, 
        limit=limit,
        config_type=config_type,
        is_active=is_active
    )
    
    total = email_config.count(
        db=db,
        config_type=config_type,
        is_active=is_active
    )
    
    active_config = email_config.get_active_config(db=db)
    
    return EmailConfigList(
        configs=configs,
        total=total,
        active_config=active_config
    )

@router.get("/configs/{config_id}", response_model=EmailConfigResponse)
def get_email_config(
    config_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """获取单个邮件配置（仅超级管理员）"""
    
    config = email_config.get(db=db, config_id=config_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邮件配置不存在"
        )
    
    return config

@router.post("/configs", response_model=EmailConfigResponse)
def create_email_config(
    config_in: EmailConfigCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """创建邮件配置（仅超级管理员）"""
    
    # 检查配置名称是否已存在
    existing_config = email_config.get_by_name(db=db, config_name=config_in.config_name)
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="配置名称已存在"
        )
    
    # 如果是Gmail配置，验证Gmail地址和App Password
    if config_in.config_type == "gmail":
        # 验证Gmail地址
        is_valid, error_msg = gmail_validator.validate_gmail_address(config_in.gmail_address)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gmail地址无效: {error_msg}"
            )
        
        # 验证App Password
        is_valid, error_msg = gmail_validator.validate_app_password(config_in.gmail_app_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"App Password无效: {error_msg}"
            )
    
    # 创建配置
    config = email_config.create(db=db, obj_in=config_in, created_by=current_user.id)
    
    return config

@router.put("/configs/{config_id}", response_model=EmailConfigResponse)
def update_email_config(
    config_id: int,
    config_in: EmailConfigUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """更新邮件配置（仅超级管理员）"""
    
    config = email_config.get(db=db, config_id=config_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邮件配置不存在"
        )
    
    # 如果更新Gmail相关信息，进行验证
    if config.config_type == "gmail":
        if config_in.gmail_address:
            is_valid, error_msg = gmail_validator.validate_gmail_address(config_in.gmail_address)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Gmail地址无效: {error_msg}"
                )
        
        if config_in.gmail_app_password:
            is_valid, error_msg = gmail_validator.validate_app_password(config_in.gmail_app_password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"App Password无效: {error_msg}"
                )
    
    # 更新配置
    config = email_config.update(
        db=db, 
        db_obj=config, 
        obj_in=config_in, 
        updated_by=current_user.id
    )
    
    return config

@router.delete("/configs/{config_id}")
def delete_email_config(
    config_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """删除邮件配置（仅超级管理员）"""

    config = email_config.get(db=db, config_id=config_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邮件配置不存在"
        )

    # 允许删除任何配置，包括激活的配置
    # 如果删除的是激活配置，系统将没有激活的邮件配置

    success = email_config.delete(db=db, config_id=config_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除失败"
        )

    message = "邮件配置已删除"
    if config.is_active:
        message += "，系统当前没有激活的邮件配置"

    return {"message": message}

@router.post("/configs/{config_id}/activate", response_model=EmailConfigResponse)
def activate_email_config(
    config_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """激活邮件配置（仅超级管理员）"""

    # 检查配置是否存在
    target_config = email_config.get(db=db, config_id=config_id)
    if not target_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邮件配置不存在"
        )

    # 如果已经是激活状态，直接返回
    if target_config.is_active:
        return target_config

    config = email_config.activate_config(
        db=db,
        config_id=config_id,
        updated_by=current_user.id
    )

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="激活配置失败"
        )

    return config

@router.post("/configs/{config_id}/test", response_model=EmailTestResponse)
def test_email_config(
    config_id: int,
    test_request: EmailTestRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """测试邮件配置（仅超级管理员）"""
    
    config = email_config.get(db=db, config_id=config_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邮件配置不存在"
        )
    
    if config.config_type != "gmail":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="目前只支持Gmail配置测试"
        )
    
    # 获取解密后的密码
    app_password = email_config.get_decrypted_password(db=db, config_id=config_id)
    if not app_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法获取App Password"
        )
    
    # 发送测试邮件
    success, error_msg = gmail_validator.send_test_email(
        gmail_address=config.gmail_address,
        app_password=app_password,
        to_email=test_request.test_email,
        sender_name=config.sender_name,
        subject=test_request.subject,
        message=test_request.message,
        timeout=config.timeout
    )
    
    # 更新测试结果
    email_config.update_test_result(
        db=db,
        config_id=config_id,
        success=success,
        error_message=error_msg
    )
    
    return EmailTestResponse(
        success=success,
        message="测试邮件发送成功" if success else f"测试失败: {error_msg}",
        test_time=datetime.now(),
        error_details=error_msg if not success else None
    )

@router.post("/gmail/quick-setup", response_model=EmailConfigResponse)
def gmail_quick_setup(
    setup_data: GmailConfigQuickSetup,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """Gmail快速配置（仅超级管理员）"""
    
    # 验证Gmail地址
    is_valid, error_msg = gmail_validator.validate_gmail_address(setup_data.gmail_address)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gmail地址无效: {error_msg}"
        )
    
    # 验证App Password
    is_valid, error_msg = gmail_validator.validate_app_password(setup_data.gmail_app_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"App Password无效: {error_msg}"
        )
    
    # 测试连接
    success, error_msg = gmail_validator.validate_connection(
        gmail_address=setup_data.gmail_address,
        app_password=setup_data.gmail_app_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gmail连接测试失败: {error_msg}"
        )
    
    # 创建配置
    config_data = EmailConfigCreate(
        config_name=f"Gmail - {setup_data.gmail_address}",
        config_type="gmail",
        is_active=setup_data.set_as_default,
        is_default=setup_data.set_as_default,
        gmail_address=setup_data.gmail_address,
        gmail_app_password=setup_data.gmail_app_password,
        sender_name=setup_data.sender_name
    )
    
    config = email_config.create(db=db, obj_in=config_data, created_by=current_user.id)
    
    # 更新测试结果
    email_config.update_test_result(
        db=db,
        config_id=config.id,
        success=True,
        error_message=None
    )
    
    return config

@router.get("/stats", response_model=EmailConfigStats)
def get_email_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_superadmin_user)
):
    """获取邮件配置统计信息（仅超级管理员）"""
    
    total_configs = email_config.count(db=db)
    active_configs = email_config.count(db=db, is_active=True)
    gmail_configs = email_config.count(db=db, config_type="gmail")
    smtp_configs = email_config.count(db=db, config_type="smtp")
    
    # 计算总发送邮件数
    all_configs = email_config.get_multi(db=db, limit=1000)
    total_emails_sent = sum(config.emails_sent or 0 for config in all_configs)
    
    # 获取最后发送邮件时间
    last_email_sent = None
    for config in all_configs:
        if config.last_used_at:
            if not last_email_sent or config.last_used_at > last_email_sent:
                last_email_sent = config.last_used_at
    
    return EmailConfigStats(
        total_configs=total_configs,
        active_configs=active_configs,
        gmail_configs=gmail_configs,
        smtp_configs=smtp_configs,
        total_emails_sent=total_emails_sent,
        last_email_sent=last_email_sent
    )
