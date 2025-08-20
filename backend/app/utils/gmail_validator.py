#!/usr/bin/env python3
"""
Gmail配置验证工具
用于验证Gmail SMTP配置是否正确
"""

import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class GmailValidator:
    """Gmail配置验证器"""
    
    def __init__(self):
        self.smtp_host = "smtp.gmail.com"
        self.smtp_port = 587
        self.timeout = 30
    
    def validate_connection(
        self, 
        gmail_address: str, 
        app_password: str,
        timeout: int = 30
    ) -> Tuple[bool, Optional[str]]:
        """
        验证Gmail SMTP连接
        
        Args:
            gmail_address: Gmail邮箱地址
            app_password: Gmail App Password
            timeout: 连接超时时间
            
        Returns:
            Tuple[bool, Optional[str]]: (是否成功, 错误信息)
        """
        try:
            # 创建SMTP连接
            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=timeout)
            server.set_debuglevel(0)  # 关闭调试信息
            
            # 启用TLS
            server.starttls()
            
            # 尝试登录
            server.login(gmail_address, app_password)
            
            # 关闭连接
            server.quit()
            
            logger.info(f"Gmail配置验证成功: {gmail_address}")
            return True, None
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = "认证失败：请检查Gmail地址和App Password是否正确"
            logger.warning(f"Gmail认证失败: {gmail_address} - {str(e)}")
            return False, error_msg
            
        except smtplib.SMTPConnectError as e:
            error_msg = "连接失败：无法连接到Gmail SMTP服务器"
            logger.error(f"Gmail连接失败: {str(e)}")
            return False, error_msg
            
        except smtplib.SMTPServerDisconnected as e:
            error_msg = "服务器断开连接：请稍后重试"
            logger.error(f"Gmail服务器断开: {str(e)}")
            return False, error_msg
            
        except socket.timeout:
            error_msg = f"连接超时：请检查网络连接（超时时间：{timeout}秒）"
            logger.error(f"Gmail连接超时: {gmail_address}")
            return False, error_msg
            
        except socket.gaierror as e:
            error_msg = "DNS解析失败：请检查网络连接"
            logger.error(f"Gmail DNS解析失败: {str(e)}")
            return False, error_msg
            
        except Exception as e:
            error_msg = f"未知错误：{str(e)}"
            logger.error(f"Gmail验证未知错误: {gmail_address} - {str(e)}")
            return False, error_msg
    
    def send_test_email(
        self,
        gmail_address: str,
        app_password: str,
        to_email: str,
        sender_name: Optional[str] = None,
        subject: str = "邮件配置测试",
        message: str = "这是一封测试邮件，用于验证邮件配置是否正常工作。",
        timeout: int = 30
    ) -> Tuple[bool, Optional[str]]:
        """
        发送测试邮件
        
        Args:
            gmail_address: Gmail邮箱地址
            app_password: Gmail App Password
            to_email: 收件人邮箱
            sender_name: 发件人显示名称
            subject: 邮件主题
            message: 邮件内容
            timeout: 连接超时时间
            
        Returns:
            Tuple[bool, Optional[str]]: (是否成功, 错误信息)
        """
        try:
            # 创建邮件
            msg = MIMEMultipart()
            
            # 设置发件人
            if sender_name:
                msg['From'] = f"{sender_name} <{gmail_address}>"
            else:
                msg['From'] = gmail_address
            
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # 邮件内容
            body = f"""{message}

发送时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
发件人: {gmail_address}
配置类型: Gmail SMTP

此邮件由系统自动发送，请勿回复。"""
            
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # 创建SMTP连接
            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=timeout)
            server.set_debuglevel(0)
            
            # 启用TLS
            server.starttls()
            
            # 登录
            server.login(gmail_address, app_password)
            
            # 发送邮件
            text = msg.as_string()
            server.sendmail(gmail_address, to_email, text)
            
            # 关闭连接
            server.quit()
            
            logger.info(f"测试邮件发送成功: {gmail_address} -> {to_email}")
            return True, None
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = "认证失败：请检查Gmail地址和App Password是否正确"
            logger.warning(f"测试邮件认证失败: {gmail_address} - {str(e)}")
            return False, error_msg
            
        except smtplib.SMTPRecipientsRefused as e:
            error_msg = f"收件人地址被拒绝：{to_email}"
            logger.warning(f"测试邮件收件人被拒绝: {to_email} - {str(e)}")
            return False, error_msg
            
        except smtplib.SMTPSenderRefused as e:
            error_msg = f"发件人地址被拒绝：{gmail_address}"
            logger.warning(f"测试邮件发件人被拒绝: {gmail_address} - {str(e)}")
            return False, error_msg
            
        except smtplib.SMTPDataError as e:
            error_msg = "邮件数据错误：请检查邮件内容"
            logger.error(f"测试邮件数据错误: {str(e)}")
            return False, error_msg
            
        except socket.timeout:
            error_msg = f"发送超时：请稍后重试（超时时间：{timeout}秒）"
            logger.error(f"测试邮件发送超时: {gmail_address} -> {to_email}")
            return False, error_msg
            
        except Exception as e:
            error_msg = f"发送失败：{str(e)}"
            logger.error(f"测试邮件发送失败: {gmail_address} -> {to_email} - {str(e)}")
            return False, error_msg
    
    def validate_gmail_address(self, email: str) -> Tuple[bool, Optional[str]]:
        """
        验证是否为有效的Gmail地址
        
        Args:
            email: 邮箱地址
            
        Returns:
            Tuple[bool, Optional[str]]: (是否有效, 错误信息)
        """
        if not email:
            return False, "邮箱地址不能为空"
        
        email = email.lower().strip()
        
        if not email.endswith('@gmail.com'):
            return False, "必须是Gmail邮箱地址（@gmail.com）"
        
        # 简单的邮箱格式验证
        local_part = email.split('@')[0]
        if not local_part or len(local_part) < 1:
            return False, "邮箱地址格式不正确"
        
        return True, None
    
    def validate_app_password(self, password: str) -> Tuple[bool, Optional[str]]:
        """
        验证App Password格式
        
        Args:
            password: App Password
            
        Returns:
            Tuple[bool, Optional[str]]: (是否有效, 错误信息)
        """
        if not password:
            return False, "App Password不能为空"
        
        # 移除空格
        password = password.replace(' ', '')
        
        if len(password) != 16:
            return False, "App Password必须是16位字符"
        
        if not password.isalnum():
            return False, "App Password只能包含字母和数字"
        
        return True, None

# 创建全局实例
gmail_validator = GmailValidator()
