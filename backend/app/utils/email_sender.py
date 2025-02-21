import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional
from pathlib import Path
from app.core.config import settings

class EmailSender:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.sender_email = settings.SENDER_EMAIL
    
    def send_supplier_order(
        self,
        supplier_email: str,
        supplier_name: str,
        order_file: str,
        cc_emails: Optional[List[str]] = None
    ) -> bool:
        """发送供应商订单邮件"""
        # 如果没有配置SMTP，跳过发送
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
            
            return True
        
        except Exception as e:
            print(f"发送邮件失败: {str(e)}")
            return False 