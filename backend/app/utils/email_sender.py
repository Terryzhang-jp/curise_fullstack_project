import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.config import settings
from app.utils.gmail_sender import create_gmail_sender

class EmailSender:
    def __init__(self, db: Optional[Session] = None, use_gmail_config: bool = True):
        """
        初始化邮件发送器

        Args:
            db: 数据库会话，如果提供且use_gmail_config=True，则优先使用Gmail配置
            use_gmail_config: 是否优先使用Gmail配置
        """
        self.db = db
        self.use_gmail_config = use_gmail_config
        self.gmail_sender = None

        # 尝试初始化Gmail发送器
        if db and use_gmail_config:
            try:
                self.gmail_sender = create_gmail_sender(db)
            except Exception as e:
                print(f"Gmail配置初始化失败，使用传统SMTP配置: {str(e)}")

        # 传统SMTP配置（作为备用）
        self.smtp_server = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.sender_email = settings.SENDER_EMAIL
    
    def send_supplier_order(
        self,
        supplier_email: str,
        supplier_name: str,
        order_file: str,
        cc_emails: Optional[List[str]] = None,
        order_data: Optional[dict] = None
    ) -> bool:
        """发送供应商订单邮件"""

        # 优先使用Gmail发送器
        if self.gmail_sender:
            try:
                # 读取Excel文件
                with open(order_file, 'rb') as f:
                    excel_content = f.read()

                # 准备订单数据
                if not order_data:
                    order_data = {
                        'invoice_number': 'N/A',
                        'voyage_number': 'N/A',
                        'delivery_date': 'N/A',
                        'delivery_address': 'N/A',
                        'products': []
                    }

                # 使用Gmail发送器发送
                success, error = self.gmail_sender.send_order_notification(
                    supplier_email=supplier_email,
                    supplier_name=supplier_name,
                    order_data=order_data,
                    excel_attachment=excel_content,
                    excel_filename=Path(order_file).name
                )

                if success:
                    print(f"Gmail发送成功: {supplier_email}")
                    return True
                else:
                    print(f"Gmail发送失败: {error}")
                    # 继续尝试传统SMTP

            except Exception as e:
                print(f"Gmail发送异常: {str(e)}")
                # 继续尝试传统SMTP

        # 传统SMTP发送（备用方案）
        if not all([self.smtp_username, self.smtp_password, self.sender_email]):
            print("SMTP未配置，跳过邮件发送")
            return False
            
        try:
            # 创建邮件
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = supplier_email
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            msg['Subject'] = f'新订单通知 - {supplier_name}'
            
            # 邮件正文
            body = f"""尊敬的{supplier_name}：

您好！

附件是最新的订单明细，请查收。

如有任何问题，请及时与我们联系。

谢谢！

此致
敬礼"""
            
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # 添加附件
            with open(order_file, 'rb') as f:
                attachment = MIMEApplication(f.read())
                attachment.add_header(
                    'Content-Disposition',
                    'attachment',
                    filename=Path(order_file).name
                )
                msg.attach(attachment)
            
            # 发送邮件
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                recipients = [supplier_email]
                if cc_emails:
                    recipients.extend(cc_emails)
                server.sendmail(
                    self.sender_email,
                    recipients,
                    msg.as_string()
                )

            print(f"传统SMTP发送成功: {supplier_email}")
            return True

        except Exception as e:
            print(f"发送邮件失败: {str(e)}")
            return False

    def get_sender_info(self) -> dict:
        """获取发送器信息"""
        if self.gmail_sender:
            return {
                'type': 'gmail',
                'config': self.gmail_sender.get_config_info()
            }
        else:
            return {
                'type': 'smtp',
                'config': {
                    'smtp_server': self.smtp_server,
                    'smtp_port': self.smtp_port,
                    'sender_email': self.sender_email,
                    'configured': bool(self.smtp_username and self.smtp_password and self.sender_email)
                }
            }