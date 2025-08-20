import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Dict, Optional, Union
from app.core.config import settings

async def send_email_with_attachments(
    to_email: str,
    subject: str,
    body: str,
    attachments: List[Dict[str, Union[bytes, str]]],
    cc_list: Optional[List[str]] = None,
    bcc_list: Optional[List[str]] = None
) -> None:
    """
    模拟发送带多个附件的邮件（仅用于测试）
    
    :param to_email: 收件人邮箱
    :param subject: 邮件主题
    :param body: 邮件正文
    :param attachments: 附件列表，每个附件是一个字典，包含：
        - content: 附件内容（bytes）
        - filename: 附件文件名
        - content_type: 附件MIME类型
    :param cc_list: 抄送列表，可选
    :param bcc_list: 密送列表，可选
    """
    # 仅用于测试，记录发送信息
    print(f"模拟发送邮件：")
    print(f"收件人: {to_email}")
    print(f"抄送: {cc_list if cc_list else '无'}")
    print(f"密送: {bcc_list if bcc_list else '无'}")
    print(f"主题: {subject}")
    print(f"附件数量: {len(attachments)}")
    return True 