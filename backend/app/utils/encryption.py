#!/usr/bin/env python3
"""
密码加密工具
用于安全存储Gmail App Password等敏感信息
"""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings

class PasswordEncryption:
    """密码加密解密工具类"""
    
    def __init__(self):
        self._fernet = None
    
    def _get_fernet(self) -> Fernet:
        """获取Fernet加密实例"""
        if self._fernet is None:
            # 使用应用密钥生成加密密钥
            password = settings.SECRET_KEY.encode()
            salt = b'gmail_config_salt'  # 固定盐值，生产环境应该使用随机盐值
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(password))
            self._fernet = Fernet(key)
        
        return self._fernet
    
    def encrypt_password(self, password: str) -> str:
        """
        加密密码
        
        Args:
            password: 明文密码
            
        Returns:
            str: 加密后的密码（base64编码）
        """
        if not password:
            return ""
        
        try:
            fernet = self._get_fernet()
            encrypted_bytes = fernet.encrypt(password.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
        except Exception as e:
            raise ValueError(f"密码加密失败: {str(e)}")
    
    def decrypt_password(self, encrypted_password: str) -> str:
        """
        解密密码
        
        Args:
            encrypted_password: 加密的密码（base64编码）
            
        Returns:
            str: 明文密码
        """
        if not encrypted_password:
            return ""
        
        try:
            fernet = self._get_fernet()
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_password.encode('utf-8'))
            decrypted_bytes = fernet.decrypt(encrypted_bytes)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            raise ValueError(f"密码解密失败: {str(e)}")
    
    def is_encrypted(self, password: str) -> bool:
        """
        检查密码是否已加密
        
        Args:
            password: 待检查的密码
            
        Returns:
            bool: True表示已加密，False表示未加密
        """
        if not password:
            return False
        
        try:
            # 尝试解密，如果成功说明是加密的
            self.decrypt_password(password)
            return True
        except:
            return False

# 全局加密实例
password_encryption = PasswordEncryption()

def encrypt_password(password: str) -> str:
    """加密密码的便捷函数"""
    return password_encryption.encrypt_password(password)

def decrypt_password(encrypted_password: str) -> str:
    """解密密码的便捷函数"""
    return password_encryption.decrypt_password(encrypted_password)

def is_encrypted(password: str) -> bool:
    """检查密码是否已加密的便捷函数"""
    return password_encryption.is_encrypted(password)
