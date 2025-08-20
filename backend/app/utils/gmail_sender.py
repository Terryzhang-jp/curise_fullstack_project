#!/usr/bin/env python3
"""
增强的Gmail邮件发送器
集成数据库配置，支持动态配置切换
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.header import Header
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import urllib.parse
from sqlalchemy.orm import Session

from app.models.email_config import EmailConfig
from app.crud.email_config import email_config
from app.utils.encryption import decrypt_password

logger = logging.getLogger(__name__)

class GmailSender:
    """增强的Gmail邮件发送器"""
    
    def __init__(self, db: Session, config_id: Optional[int] = None):
        """
        初始化Gmail发送器
        
        Args:
            db: 数据库会话
            config_id: 指定的配置ID，如果为None则使用默认激活配置
        """
        self.db = db
        self.config = self._load_config(config_id)
        
        if not self.config:
            raise ValueError("未找到可用的Gmail配置")
        
        if not self.config.is_active:
            raise ValueError("Gmail配置未激活")
        
        # 解密密码
        try:
            self.app_password = decrypt_password(self.config.gmail_app_password)
        except Exception as e:
            raise ValueError(f"无法解密App Password: {str(e)}")
        
        # SMTP配置
        self.smtp_host = self.config.smtp_host or "smtp.gmail.com"
        self.smtp_port = self.config.smtp_port or 587
        self.timeout = self.config.timeout or 30
        self.max_retries = self.config.max_retries or 3
        
        logger.info(f"Gmail发送器初始化成功: {self.config.gmail_address}")
    
    def _load_config(self, config_id: Optional[int] = None) -> Optional[EmailConfig]:
        """加载邮件配置"""
        if config_id:
            return email_config.get(self.db, config_id)
        else:
            return email_config.get_active_config(self.db)
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        is_html: bool = False
    ) -> Tuple[bool, Optional[str]]:
        """
        发送邮件
        
        Args:
            to_emails: 收件人邮箱列表
            subject: 邮件主题
            body: 邮件内容
            cc_emails: 抄送邮箱列表
            bcc_emails: 密送邮箱列表
            attachments: 附件列表，格式: [{"filename": "file.txt", "content": bytes, "content_type": "text/plain"}]
            is_html: 是否为HTML格式
            
        Returns:
            Tuple[bool, Optional[str]]: (是否成功, 错误信息)
        """
        
        retry_count = 0
        last_error = None
        
        while retry_count <= self.max_retries:
            try:
                # 创建邮件
                msg = self._create_message(
                    to_emails=to_emails,
                    subject=subject,
                    body=body,
                    cc_emails=cc_emails,
                    bcc_emails=bcc_emails,
                    attachments=attachments,
                    is_html=is_html
                )
                
                # 发送邮件
                success, error = self._send_message(msg, to_emails, cc_emails, bcc_emails)
                
                if success:
                    # 更新发送统计
                    email_config.increment_email_count(self.db, self.config.id)
                    
                    logger.info(f"邮件发送成功: {self.config.gmail_address} -> {', '.join(to_emails)}")
                    return True, None
                else:
                    last_error = error
                    retry_count += 1
                    
                    if retry_count <= self.max_retries:
                        logger.warning(f"邮件发送失败，第{retry_count}次重试: {error}")
                    else:
                        logger.error(f"邮件发送失败，已达最大重试次数: {error}")
                        return False, error
                        
            except Exception as e:
                last_error = str(e)
                retry_count += 1
                
                if retry_count <= self.max_retries:
                    logger.warning(f"邮件发送异常，第{retry_count}次重试: {str(e)}")
                else:
                    logger.error(f"邮件发送异常，已达最大重试次数: {str(e)}")
                    return False, str(e)
        
        return False, last_error
    
    def _create_message(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        is_html: bool = False
    ) -> MIMEMultipart:
        """创建邮件消息"""
        
        msg = MIMEMultipart()
        
        # 设置发件人
        if self.config.sender_name:
            msg['From'] = f"{self.config.sender_name} <{self.config.gmail_address}>"
        else:
            msg['From'] = self.config.gmail_address
        
        # 设置收件人
        msg['To'] = ', '.join(to_emails)
        
        # 设置抄送
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        
        # 设置主题
        msg['Subject'] = subject
        
        # 设置日期
        msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')
        
        # 添加邮件内容
        content_type = 'html' if is_html else 'plain'
        msg.attach(MIMEText(body, content_type, 'utf-8'))
        
        # 添加附件
        if attachments:
            for attachment in attachments:
                self._add_attachment(msg, attachment)
        
        return msg
    
    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """添加附件"""
        try:
            filename = attachment["filename"]
            content_type = attachment.get('content_type', 'application/octet-stream')

            # 根据文件扩展名设置正确的MIME类型
            if filename.endswith('.xlsx'):
                content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            elif filename.endswith('.xls'):
                content_type = 'application/vnd.ms-excel'
            elif filename.endswith('.pdf'):
                content_type = 'application/pdf'

            # 创建MIME部分
            if content_type.startswith('application/'):
                maintype, subtype = content_type.split('/', 1)
                part = MIMEBase(maintype, subtype)
            else:
                part = MIMEBase('application', 'octet-stream')

            part.set_payload(attachment['content'])
            encoders.encode_base64(part)

            # 使用更简单但更兼容的文件名处理方式
            # 方法1: 尝试简单的ASCII文件名
            try:
                filename.encode('ascii')
                # ASCII文件名，直接使用
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename="{filename}"'
                )
                logger.debug(f"使用ASCII文件名: {filename}")
            except UnicodeEncodeError:
                # 方法2: 对于非ASCII文件名，使用RFC 2231编码
                encoded_filename = urllib.parse.quote(filename.encode('utf-8'))
                part.add_header(
                    'Content-Disposition',
                    f"attachment; filename*=UTF-8''{encoded_filename}"
                )
                logger.debug(f"使用UTF-8编码文件名: {filename} -> {encoded_filename}")

            # 设置内容类型
            part.set_type(content_type)

            msg.attach(part)
            logger.info(f"成功添加附件: {filename} (类型: {content_type})")

        except Exception as e:
            logger.error(f"添加附件失败: {attachment.get('filename', 'unknown')} - {str(e)}")
    
    def _send_message(
        self,
        msg: MIMEMultipart,
        to_emails: List[str],
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None
    ) -> Tuple[bool, Optional[str]]:
        """发送邮件消息"""
        
        try:
            # 创建SMTP连接
            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=self.timeout)
            server.set_debuglevel(0)
            
            # 启用TLS
            server.starttls()
            
            # 登录
            server.login(self.config.gmail_address, self.app_password)
            
            # 准备收件人列表
            all_recipients = to_emails.copy()
            if cc_emails:
                all_recipients.extend(cc_emails)
            if bcc_emails:
                all_recipients.extend(bcc_emails)
            
            # 发送邮件
            text = msg.as_string()
            server.sendmail(self.config.gmail_address, all_recipients, text)
            
            # 关闭连接
            server.quit()
            
            return True, None
            
        except smtplib.SMTPAuthenticationError as e:
            return False, f"认证失败: {str(e)}"
        except smtplib.SMTPRecipientsRefused as e:
            return False, f"收件人被拒绝: {str(e)}"
        except smtplib.SMTPSenderRefused as e:
            return False, f"发件人被拒绝: {str(e)}"
        except smtplib.SMTPDataError as e:
            return False, f"邮件数据错误: {str(e)}"
        except Exception as e:
            return False, f"发送失败: {str(e)}"
    
    def send_order_notification(
        self,
        supplier_email: str,
        supplier_name: str,
        order_data: Dict[str, Any],
        excel_attachment: Optional[bytes] = None,
        excel_filename: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        发送订单通知邮件
        
        Args:
            supplier_email: 供应商邮箱
            supplier_name: 供应商名称
            order_data: 订单数据
            excel_attachment: Excel附件内容
            excel_filename: Excel文件名
            
        Returns:
            Tuple[bool, Optional[str]]: (是否成功, 错误信息)
        """
        
        # 构建邮件内容
        subject = f"订单通知 - {order_data.get('invoice_number', 'N/A')}"
        
        body = f"""尊敬的{supplier_name}：

您好！

附件是最新的订单明细，请查收。

订单信息：
- 订单号：{order_data.get('invoice_number', 'N/A')}
- 航次：{order_data.get('voyage_number', 'N/A')}
- 交货日期：{order_data.get('delivery_date', 'N/A')}
- 交货地址：{order_data.get('delivery_address', 'N/A')}
- 产品数量：{len(order_data.get('products', []))}

如有任何问题，请及时与我们联系。

谢谢！

此致
敬礼

---
此邮件由系统自动发送，发送时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        # 准备附件
        attachments = []
        if excel_attachment and excel_filename:
            attachments.append({
                'filename': excel_filename,
                'content': excel_attachment,
                'content_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            })
        
        # 发送邮件
        return self.send_email(
            to_emails=[supplier_email],
            subject=subject,
            body=body,
            attachments=attachments
        )
    
    def get_config_info(self) -> Dict[str, Any]:
        """获取当前配置信息"""
        return {
            'config_id': self.config.id,
            'config_name': self.config.config_name,
            'gmail_address': self.config.gmail_address,
            'sender_name': self.config.sender_name,
            'smtp_host': self.smtp_host,
            'smtp_port': self.smtp_port,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'emails_sent': self.config.emails_sent,
            'last_used_at': self.config.last_used_at.isoformat() if self.config.last_used_at else None
        }

def create_gmail_sender(db: Session, config_id: Optional[int] = None) -> GmailSender:
    """创建Gmail发送器的便捷函数"""
    return GmailSender(db=db, config_id=config_id)
