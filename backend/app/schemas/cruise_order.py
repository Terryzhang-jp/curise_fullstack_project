from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class CruiseOrderProduct(BaseModel):
    """邮轮订单产品信息"""
    product_id: Optional[str] = None
    product_name: str
    quantity: float
    unit_price: float
    total_price: float
    currency: str = "JPY"
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    item_code: Optional[str] = None  # G列的产品代码


class CruiseOrderHeader(BaseModel):
    """邮轮订单头部信息"""
    po_number: str
    ship_name: str
    ship_code: Optional[str] = None
    supplier_name: str
    supplier_id: Optional[int] = None
    destination_port: str
    port_id: Optional[int] = None
    delivery_date: datetime
    currency: str = "JPY"
    total_amount: float = 0.0
    products: List[CruiseOrderProduct] = []


class CruiseOrderUploadRequest(BaseModel):
    """邮轮订单上传请求"""
    file_name: str
    description: Optional[str] = None


class CruiseOrderUploadResponse(BaseModel):
    """邮轮订单上传响应"""
    upload_id: int
    file_name: str
    total_orders: int
    total_products: int
    orders: List[CruiseOrderHeader]
    status: str = "uploaded"
    created_at: datetime


class CruiseOrderConfirmRequest(BaseModel):
    """邮轮订单确认请求"""
    upload_id: int
    orders_to_confirm: List[str]  # PO numbers to confirm


class CruiseOrderConfirmResponse(BaseModel):
    """邮轮订单确认响应"""
    upload_id: int
    confirmed_orders: int
    created_orders: List[int]  # Order IDs
    status: str = "confirmed"
    message: str


class CruiseOrderAnalysisResponse(BaseModel):
    """邮轮订单分析响应"""
    upload_id: int
    total_orders: int
    total_products: int
    products_by_category: Dict[str, int]
    orders_by_supplier: Dict[str, int]
    total_value: float
    currency: str
    analysis_summary: Dict[str, Any]


class ProductMatchResult(BaseModel):
    """产品匹配结果"""
    cruise_product: CruiseOrderProduct
    matched_product: Optional[Dict[str, Any]] = None
    match_status: str  # "matched", "not_matched", "multiple_matches"
    match_score: float  # 匹配度分数 0-1
    match_reason: str  # 匹配原因说明


class CruiseOrderMatchRequest(BaseModel):
    """邮轮订单匹配请求"""
    upload_id: int


class CruiseOrderMatchResponse(BaseModel):
    """邮轮订单匹配响应"""
    upload_id: int
    total_products: int
    matched_products: int
    unmatched_products: int
    match_results: List[ProductMatchResult]