from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.models import OrderAnalysis, OrderAnalysisItem, OrderUpload, Product
from app.schemas.order_analysis import OrderAnalysisCreate, OrderAnalysisItemCreate

class CRUDOrderAnalysis(CRUDBase[OrderAnalysis, OrderAnalysisCreate, OrderAnalysisCreate]):
    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[OrderAnalysis]:
        """获取订单分析列表，支持按状态筛选"""
        query = db.query(OrderAnalysis)
        if status:
            query = query.filter(OrderAnalysis.status == status)
        return query.offset(skip).limit(limit).all()

    def create_from_upload(
        self,
        db: Session,
        *,
        file_name: str,
        country_id: int,
        ship_id: int,
        orders: List[Dict[str, Any]]
    ) -> OrderAnalysis:
        """从上传文件创建订单分析"""
        # 创建上传记录
        upload = OrderUpload(
            file_name=file_name,
            country_id=country_id,
            ship_id=ship_id
        )
        db.add(upload)
        db.flush()
        
        analyses = []
        for order in orders:
            # 创建订单分析
            analysis = OrderAnalysis(
                upload_id=upload.id,
                order_no=order['header']['order_no'],
                order_date=order['header']['order_date'],
                currency=order['header']['currency'],
                ship_code=order['header']['ship_code'],
                delivery_date=order['header']['delivery_date'],
                supplier_info=order['header']['supplier_info'],
                notes=order['header']['notes']
            )
            db.add(analysis)
            db.flush()
            
            # 处理订单项
            for item in order['items']:
                # 尝试匹配产品
                product = None
                if item['product_code']:
                    product = db.query(Product).filter(
                        Product.code == item['product_code']
                    ).first()
                
                # 创建订单分析项
                analysis_item = OrderAnalysisItem(
                    analysis_id=analysis.id,
                    product_code=item['product_code'],
                    quantity=item['quantity'],
                    unit=item['unit'],
                    unit_price=item['unit_price'],
                    description=item['description'],
                    matched_product_id=product.id if product else None,
                    category_id=product.category_id if product else None
                )
                db.add(analysis_item)
            
            analyses.append(analysis)
        
        db.commit()
        return analyses[0] if analyses else None
    
    def get_items(
        self,
        db: Session,
        *,
        analysis_id: int,
        category_id: Optional[int] = None
    ) -> List[OrderAnalysisItem]:
        """获取订单分析项目"""
        query = db.query(OrderAnalysisItem).filter(
            OrderAnalysisItem.analysis_id == analysis_id
        )
        
        if category_id is not None:
            query = query.filter(OrderAnalysisItem.category_id == category_id)
        
        return query.all()

order_analysis = CRUDOrderAnalysis(OrderAnalysis) 