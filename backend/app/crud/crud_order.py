from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session, joinedload
from fastapi.encoders import jsonable_encoder
from app.crud.base import CRUDBase
from app.models.models import Order, OrderItem
from app.schemas.order import OrderCreate, OrderUpdate
import logging

class CRUDOrder(CRUDBase[Order, OrderCreate, OrderUpdate]):
    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        include_relations: bool = False
    ) -> List[Order]:
        try:
            logger = logging.getLogger(__name__)
            logger.info("开始查询订单列表")
            query = db.query(self.model)
            
            # 加载关联数据
            if include_relations:
                logger.info("加载关联数据")
                query = query.options(
                    joinedload(Order.ship),
                    joinedload(Order.company),
                    joinedload(Order.port),
                    joinedload(Order.order_items).joinedload(OrderItem.product),
                    joinedload(Order.order_items).joinedload(OrderItem.supplier)
                )

            if status:
                query = query.filter(self.model.status == status)
                logger.info(f"按状态过滤: {status}")

            # 执行查询
            result = query.offset(skip).limit(limit).all()
            logger.info(f"查询完成，获取到 {len(result)} 条记录")
            
            # 记录订单项目信息
            if include_relations:
                for order in result:
                    logger.info(f"订单 {order.order_no} 的项目数: {len(order.order_items)}")
                    for item in order.order_items:
                        logger.info(f"订单项目: product_id={item.product_id}, "
                                f"product_name={item.product.name if item.product else None}, "
                                f"supplier_id={item.supplier_id}, "
                                f"supplier_name={item.supplier.name if item.supplier else None}")
            
            return result
        except Exception as e:
            logger.error(f"查询订单列表时出错: {str(e)}")
            raise

    def create_with_items(
        self,
        db: Session,
        *,
        obj_in: OrderCreate
    ) -> Order:
        try:
            logger = logging.getLogger(__name__)
            logger.info("开始创建订单")
            
            obj_in_data = jsonable_encoder(obj_in, exclude={"items"})
            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            db.flush()  # 获取订单ID

            total_amount = 0
            # 创建订单项
            for item in obj_in.items:
                item_total = item.quantity * item.price
                total_amount += item_total
                
                db_item = OrderItem(
                    order_id=db_obj.id,
                    product_id=item.product_id,
                    supplier_id=item.supplier_id,
                    quantity=item.quantity,
                    price=item.price,
                    total=item_total,
                    status="pending"
                )
                db.add(db_item)
                logger.info(f"添加订单项目: product_id={item.product_id}, "
                          f"supplier_id={item.supplier_id}, quantity={item.quantity}")

            # 更新订单总金额
            db_obj.total_amount = total_amount
            
            db.commit()
            db.refresh(db_obj)
            logger.info(f"订单创建成功: order_no={db_obj.order_no}, total_amount={total_amount}")
            return db_obj
            
        except Exception as e:
            logger.error(f"创建订单时出错: {str(e)}")
            db.rollback()
            raise

    def update(
        self,
        db: Session,
        *,
        db_obj: Order,
        obj_in: Union[OrderUpdate, Dict[str, Any]]
    ) -> Order:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)

        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def get_with_items(
        self,
        db: Session,
        *,
        id: int
    ) -> Optional[Order]:
        """获取订单详情，包括订单项"""
        try:
            logger = logging.getLogger(__name__)
            logger.info(f"获取订单详情: id={id}")
            
            # 修改查询以确保正确加载所有关联数据，使用joinedload预加载所有关联
            order = db.query(self.model).options(
                joinedload(Order.order_items).joinedload(OrderItem.product),
                joinedload(Order.order_items).joinedload(OrderItem.supplier),
                joinedload(Order.ship),
                joinedload(Order.company),
                joinedload(Order.port)
            ).filter(self.model.id == id).first()
            
            if order:
                # 打印更多日志用于诊断
                logger.info(f"订单基本信息: {order.order_no}, 状态: {order.status}")
                logger.info(f"订单项目数量: {len(order.order_items) if order.order_items else 0}")
                if order.order_items:
                    for item in order.order_items:
                        logger.info(f"订单项目: id={item.id}, product_id={item.product_id}, "
                                  f"product_name={item.product.name if item.product else None}, "
                                  f"supplier_id={item.supplier_id}, "
                                  f"supplier_name={item.supplier.name if item.supplier else None}, "
                                  f"status={item.status}")
                else:
                    logger.warning("订单没有关联的订单项目")
            else:
                logger.warning("未找到订单")
                
            return order
        except Exception as e:
            logger.error(f"获取订单详情失败: {str(e)}")
            raise

order = CRUDOrder(Order) 