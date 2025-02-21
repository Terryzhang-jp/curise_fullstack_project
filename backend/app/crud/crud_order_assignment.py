from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.models import OrderAssignment, OrderAnalysisItem
from app.schemas.order_assignment import OrderAssignmentCreate

class CRUDOrderAssignment(CRUDBase[OrderAssignment, OrderAssignmentCreate, OrderAssignmentCreate]):
    def create_assignments(
        self,
        db: Session,
        *,
        obj_in: OrderAssignmentCreate
    ) -> List[OrderAssignment]:
        assignments = []
        
        for item in obj_in.items:
            # 获取分析项目
            analysis_item = db.query(OrderAnalysisItem).get(item.analysis_item_id)
            if not analysis_item:
                continue
            
            # 创建分配记录
            assignment = OrderAssignment(
                analysis_item_id=item.analysis_item_id,
                supplier_id=obj_in.supplier_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.quantity * item.unit_price,
                status="pending"
            )
            db.add(assignment)
            
            # 更新分析项目状态
            analysis_item.status = "assigned"
            
            assignments.append(assignment)
        
        db.commit()
        return assignments
    
    def get_by_supplier(
        self,
        db: Session,
        *,
        supplier_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[OrderAssignment]:
        return db.query(OrderAssignment).filter(
            OrderAssignment.supplier_id == supplier_id
        ).offset(skip).limit(limit).all()
    
    def get_by_analysis_item(
        self,
        db: Session,
        *,
        analysis_item_id: int
    ) -> Optional[OrderAssignment]:
        return db.query(OrderAssignment).filter(
            OrderAssignment.analysis_item_id == analysis_item_id
        ).first()
    
    def update_notification_status(
        self,
        db: Session,
        *,
        assignment_id: int,
        notification_status: str
    ) -> Optional[OrderAssignment]:
        assignment = db.query(OrderAssignment).get(assignment_id)
        if not assignment:
            return None
        
        assignment.notification_status = notification_status
        db.commit()
        db.refresh(assignment)
        return assignment

order_assignment = CRUDOrderAssignment(OrderAssignment) 