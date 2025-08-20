from typing import Optional, Any, Dict
from pydantic import BaseModel

class ApiResponse(BaseModel):
    """标准API响应结构"""
    message: str
    data: Optional[Any] = None
    details: Optional[Dict[str, Any]] = None

class BaseResponse(BaseModel):
    """基础响应结构"""
    success: bool
    message: str
    data: Optional[Any] = None

class SuccessResponse(ApiResponse):
    """成功响应"""
    message: str = "操作成功"

class ErrorResponse(ApiResponse):
    """错误响应"""
    error: bool = True
    error_code: Optional[str] = None