from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.models import OrderProcessingItem, OrderItem, User
from app.schemas.order_processing import OrderProcessingItemCreate, OrderProcessingItemUpdate

class CRUDOrderProcessing:
    def get_by_user(
        self, db: Session, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[OrderProcessingItem]:
        """获取用户的处理队列项目"""
        return db.query(OrderProcessingItem).filter(
            OrderProcessingItem.user_id == user_id
        ).order_by(OrderProcessingItem.added_at.desc()).offset(skip).limit(limit).all()
    
    def get(self, db: Session, id: int) -> Optional[OrderProcessingItem]:
        """通过ID获取处理队列项目"""
        return db.query(OrderProcessingItem).filter(OrderProcessingItem.id == id).first()
    
    def create(
        self, db: Session, *, user_id: int, obj_in: OrderProcessingItemCreate
    ) -> OrderProcessingItem:
        """创建处理队列项目"""
        db_obj = OrderProcessingItem(
            user_id=user_id,
            order_item_id=obj_in.order_item_id,
            order_no=obj_in.order_no,
            ship_name=obj_in.ship_name or "",
            product_id=obj_in.product_id,
            product_name=obj_in.product_name or "",
            product_code=obj_in.product_code or "",
            supplier_name=obj_in.supplier_name or "",
            quantity=obj_in.quantity,
            price=obj_in.price,
            total=obj_in.total,
            status="pending"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: OrderProcessingItem, obj_in: OrderProcessingItemUpdate
    ) -> OrderProcessingItem:
        """更新处理队列项目"""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def add_from_order_item(
        self, db: Session, user_id: int, order_item_id: int
    ) -> Optional[OrderProcessingItem]:
        """从订单项添加到处理队列"""
        # 检查是否已在队列中
        existing = db.query(OrderProcessingItem).filter(
            OrderProcessingItem.user_id == user_id,
            OrderProcessingItem.order_item_id == order_item_id,
            OrderProcessingItem.status == "pending"
        ).first()
        
        if existing:
            return existing
            
        # 获取订单项数据
        order_item = db.query(OrderItem).filter(OrderItem.id == order_item_id).first()
        if not order_item:
            return None
            
        # 创建对象
        obj_in = OrderProcessingItemCreate(
            order_item_id=order_item_id,
            order_no=order_item.order.order_no if order_item.order else "",
            ship_name=order_item.order.ship.name if order_item.order and order_item.order.ship else "",
            product_id=order_item.product_id,
            product_name=order_item.product.name if order_item.product else "",
            product_code=order_item.product.code if order_item.product else "",
            supplier_name=order_item.supplier.name if order_item.supplier else "",
            quantity=float(order_item.quantity),
            price=float(order_item.price),
            total=float(order_item.total)
        )
        
        return self.create(db=db, user_id=user_id, obj_in=obj_in)
        
    def add_from_local_storage(
        self, db: Session, user_id: int, items: List[Dict[str, Any]]
    ) -> List[OrderProcessingItem]:
        """从前端localStorage数据添加到处理队列"""
        results = []
        
        for item in items:
            # 如果有order_item_id，尝试从订单项添加
            if "id" in item and item["id"]:
                db_item = self.add_from_order_item(db, user_id, item["id"])
                if db_item:
                    results.append(db_item)
                    continue
            
            # 否则，从提供的数据创建
            try:
                obj_in = OrderProcessingItemCreate(
                    order_item_id=item.get("id"),
                    order_no=item.get("order_no", ""),
                    ship_name=item.get("ship_name", ""),
                    product_id=item.get("product_id"),
                    product_name=item.get("product_name", ""),
                    product_code=item.get("product_code", ""),
                    supplier_name=item.get("supplier_name", ""),
                    quantity=float(item.get("quantity", 0)),
                    price=float(item.get("price", 0)),
                    total=float(item.get("total", 0))
                )
                db_item = self.create(db=db, user_id=user_id, obj_in=obj_in)
                results.append(db_item)
            except Exception as e:
                print(f"创建处理队列项失败: {str(e)}")
                # 继续处理其他项
                
        return results
    
    def remove(self, db: Session, *, id: int) -> bool:
        """删除处理队列项目"""
        obj = self.get(db=db, id=id)
        if not obj:
            return False
            
        db.delete(obj)
        db.commit()
        return True
        
    def mark_as_processed(
        self, db: Session, *, id: int
    ) -> Optional[OrderProcessingItem]:
        """标记为已处理"""
        obj = self.get(db=db, id=id)
        if not obj:
            return None
            
        update_data = OrderProcessingItemUpdate(
            status="processed",
            processed_at=datetime.utcnow()
        )
        
        return self.update(db=db, db_obj=obj, obj_in=update_data)
    
    def clear_all_by_user(self, db: Session, user_id: int) -> int:
        """清空用户的所有处理队列项目"""
        result = db.query(OrderProcessingItem).filter(
            OrderProcessingItem.user_id == user_id
        ).delete()
        db.commit()
        return result

order_processing = CRUDOrderProcessing() 