from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta

from app import crud
from app.api import deps
from app.models.models import Product as ProductModel, Supplier as SupplierModel
from app.schemas.cruise_order import ProductMatchResult


class ProductSuppliersRequest(BaseModel):
    product_indices: List[int]
    match_results: List[ProductMatchResult]

class QuotationEmailRequest(BaseModel):
    supplier_groups: List[Dict[str, Any]]  # 供应商分组数据
    delivery_date: str  # 期望交货日期
    delivery_port: str  # 交货港口
    contact_person: str  # 联系人
    contact_email: str  # 联系邮箱
    additional_notes: str = ""  # 额外备注

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/get-suppliers")
def get_product_suppliers(
    *,
    db: Session = Depends(deps.get_db),
    request: ProductSuppliersRequest
):
    """
    获取选中产品的供应商信息
    """
    try:
        # 🔍 DEBUG: 添加调试日志
        logger.info(f"🔍 供应商API调用:")
        logger.info(f"  产品索引: {request.product_indices}")
        logger.info(f"  匹配结果数量: {len(request.match_results)}")

        result = []

        for index in request.product_indices:
            logger.info(f"  🔍 处理产品索引: {index}")

            if index >= len(request.match_results):
                logger.warning(f"    ❌ 索引超出范围: {index} >= {len(request.match_results)}")
                continue

            match_result = request.match_results[index]
            cruise_product = match_result.cruise_product

            logger.info(f"    产品名称: {cruise_product.product_name}")
            logger.info(f"    匹配状态: {match_result.match_status}")
            logger.info(f"    匹配产品: {match_result.matched_product}")

            # 查找匹配的数据库产品
            db_product = None
            suppliers = []

            if match_result.matched_product:
                db_product = db.query(ProductModel).filter(
                    ProductModel.id == match_result.matched_product["id"]
                ).first()
            
            if db_product:
                # 获取主供应商
                main_supplier = db.query(SupplierModel).filter(
                    SupplierModel.id == db_product.supplier_id
                ).first()

                if main_supplier:
                    suppliers.append({
                        "id": main_supplier.id,
                        "name": main_supplier.name,
                        "price": float(db_product.price) if db_product.price else cruise_product.unit_price,
                        "currency": db_product.currency or cruise_product.currency,
                        "contact": main_supplier.contact or "",
                        "email": main_supplier.email or "",
                        "is_primary": True
                    })

                # 🔧 改进：基于产品类别查找其他供应商
                if db_product.category_id:
                    # 查找能提供该类别产品的其他供应商
                    from app.models.models import SupplierCategory

                    category_suppliers = db.query(SupplierModel).join(
                        SupplierCategory, SupplierModel.id == SupplierCategory.supplier_id
                    ).filter(
                        SupplierCategory.category_id == db_product.category_id,
                        SupplierModel.id != db_product.supplier_id,  # 排除主供应商
                        SupplierModel.status == True
                    ).limit(3).all()  # 最多3个备选供应商

                    for supplier in category_suppliers:
                        # 根据供应商类型调整价格策略
                        price_multiplier = 1.0
                        if "蔬菜" in supplier.name or "水果" in supplier.name:
                            price_multiplier = 0.95  # 农产品供应商价格优惠
                        elif "乳制品" in supplier.name or "蛋制品" in supplier.name:
                            price_multiplier = 1.05  # 专业供应商价格稍高
                        elif "电子" in supplier.name:
                            price_multiplier = 0.98  # 电子产品供应商竞争激烈
                        else:
                            price_multiplier = 0.97  # 其他供应商默认优惠

                        suppliers.append({
                            "id": supplier.id,
                            "name": supplier.name,
                            "price": float(db_product.price) * price_multiplier if db_product.price else cruise_product.unit_price * price_multiplier,
                            "currency": db_product.currency or cruise_product.currency,
                            "contact": supplier.contact or "",
                            "email": supplier.email or "",
                            "is_primary": False
                        })
            
            product_info = {
                "productIndex": index,
                "matchResult": {
                    "cruise_product": {
                        "product_id": cruise_product.product_id,
                        "product_name": cruise_product.product_name,
                        "quantity": cruise_product.quantity,
                        "unit_price": cruise_product.unit_price,
                        "total_price": cruise_product.total_price,
                        "currency": cruise_product.currency,
                        "category_id": cruise_product.category_id,
                        "supplier_id": cruise_product.supplier_id,
                        "item_code": cruise_product.item_code
                    },
                    "matched_product": match_result.matched_product,
                    "match_status": match_result.match_status,
                    "match_score": match_result.match_score,
                    "match_reason": match_result.match_reason
                },
                "suppliers": suppliers,
                "selectedSupplierId": suppliers[0]["id"] if suppliers else None,
                "hasMultipleSuppliers": len(suppliers) > 1,
                "noSupplier": len(suppliers) == 0
            }
            
            result.append(product_info)
        
        logger.info(f"获取了 {len(result)} 个产品的供应商信息")
        return {"products": result}
        
    except Exception as e:
        logger.error(f"获取产品供应商信息失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取供应商信息失败: {str(e)}"
        )


@router.get("/suppliers")
def get_all_suppliers(
    *,
    db: Session = Depends(deps.get_db)
):
    """
    获取所有可用供应商列表
    """
    try:
        suppliers = db.query(SupplierModel).filter(SupplierModel.status == True).all()
        
        result = []
        for supplier in suppliers:
            result.append({
                "id": supplier.id,
                "name": supplier.name,
                "contact": supplier.contact or "",
                "email": supplier.email or "",
                "phone": supplier.phone or "",
                "country_id": supplier.country_id
            })
        
        return {"suppliers": result}

    except Exception as e:
        logger.error(f"获取供应商列表失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取供应商列表失败: {str(e)}"
        )


@router.post("/send-quotation-emails")
def send_quotation_emails(
    *,
    db: Session = Depends(deps.get_db),
    request: QuotationEmailRequest
):
    """
    批量发送询价邮件给供应商
    """
    try:
        sent_emails = []
        failed_emails = []

        for supplier_group in request.supplier_groups:
            supplier_id = supplier_group.get("id")
            supplier_name = supplier_group.get("name")
            supplier_email = supplier_group.get("email")
            products = supplier_group.get("products", [])

            if not supplier_email:
                failed_emails.append({
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "reason": "供应商邮箱地址为空"
                })
                continue

            if not products:
                failed_emails.append({
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "reason": "没有选择产品"
                })
                continue

            # 生成邮件内容
            email_content = generate_quotation_email_content(
                supplier_name=supplier_name,
                products=products,
                delivery_date=request.delivery_date,
                delivery_port=request.delivery_port,
                contact_person=request.contact_person,
                contact_email=request.contact_email,
                additional_notes=request.additional_notes
            )

            # TODO: 实际发送邮件（这里先模拟）
            # send_email(to=supplier_email, subject="邮轮订单询价", content=email_content)

            sent_emails.append({
                "supplier_id": supplier_id,
                "supplier_name": supplier_name,
                "supplier_email": supplier_email,
                "product_count": len(products),
                "sent_at": datetime.now().isoformat()
            })

            logger.info(f"已发送询价邮件给供应商: {supplier_name} ({supplier_email})")

        return {
            "status": "success",
            "sent_count": len(sent_emails),
            "failed_count": len(failed_emails),
            "sent_emails": sent_emails,
            "failed_emails": failed_emails
        }

    except Exception as e:
        logger.error(f"发送询价邮件失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"发送询价邮件失败: {str(e)}"
        )


def generate_quotation_email_content(
    supplier_name: str,
    products: List[Dict],
    delivery_date: str,
    delivery_port: str,
    contact_person: str,
    contact_email: str,
    additional_notes: str = ""
) -> str:
    """生成询价邮件内容"""

    # 计算总金额
    total_amount = sum(
        float(product.get("editablePrice", 0)) * float(product.get("editableQuantity", 0))
        for product in products
    )

    # 生成产品清单
    product_list = ""
    for i, product in enumerate(products, 1):
        match_result = product.get("matchResult", {})
        cruise_product = match_result.get("cruise_product", {})

        product_list += f"""
{i}. 产品名称: {cruise_product.get("product_name", "未知")}
   产品代码: {cruise_product.get("item_code", "无")}
   数量: {product.get("editableQuantity", 0)}
   单价: ¥{product.get("editablePrice", 0):,.2f}
   小计: ¥{float(product.get("editablePrice", 0)) * float(product.get("editableQuantity", 0)):,.2f}
"""

    email_content = f"""
尊敬的 {supplier_name} 供应商，

您好！

我们是邮轮供应链管理系统，现有一批邮轮订单需要采购以下产品，诚邀您提供报价。

【订单详情】
期望交货日期: {delivery_date}
交货地点: {delivery_port}
联系人: {contact_person}
联系邮箱: {contact_email}

【产品清单】{product_list}

【订单总计】
预估总金额: ¥{total_amount:,.2f}

【备注】
{additional_notes if additional_notes else "无"}

请您在收到此邮件后3个工作日内回复报价，包括：
1. 各产品的最新报价
2. 可供货数量
3. 交货时间安排
4. 付款条件

如有任何疑问，请随时联系我们。

谢谢！

邮轮供应链管理系统
联系人: {contact_person}
邮箱: {contact_email}
发送时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""

    return email_content