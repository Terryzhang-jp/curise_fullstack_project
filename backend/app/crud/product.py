from typing import Any, Dict, List, Optional, Union
from datetime import datetime

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app import models, schemas
import logging

logger = logging.getLogger(__name__)

def get(db: Session, id: int) -> Optional[models.Product]:
    """
    通过ID获取产品
    """
    return db.query(models.Product).filter(models.Product.id == id).first()

def get_multi(
    db: Session, *, skip: int = 0, limit: int = 100
) -> List[models.Product]:
    """
    获取多个产品
    """
    return db.query(models.Product).offset(skip).limit(limit).all()

def create(db: Session, *, obj_in: schemas.ProductCreate) -> models.Product:
    """
    创建新产品
    """
    obj_in_data = jsonable_encoder(obj_in)
    db_obj = models.Product(**obj_in_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update(db: Session, db_obj: models.Product, obj_in: Union[schemas.ProductUpdate, Dict[str, Any]]) -> models.Product:
    """
    更新产品
    """
    try:
        obj_data = jsonable_encoder(db_obj)
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        # 处理日期字段
        for field in ["effective_from", "effective_to"]:
            if field in update_data and update_data[field]:
                try:
                    # 检查日期格式
                    if isinstance(update_data[field], str):
                        # 如果是YYYY-MM-DD格式，转换为datetime
                        if len(update_data[field].split('T')[0]) == 10 and '-' in update_data[field]:
                            date_str = update_data[field].split('T')[0]
                            update_data[field] = datetime.strptime(date_str, "%Y-%m-%d")
                except Exception as e:
                    logger.error(f"日期格式转换错误: {field}={update_data[field]}, 错误: {str(e)}")
                    # 出错时使用原值
                    update_data[field] = getattr(db_obj, field)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    except Exception as e:
        db.rollback()
        logger.error(f"更新产品错误: {str(e)}")
        raise

def remove(db: Session, *, id: int) -> models.Product:
    """
    删除产品
    """
    try:
        obj = db.query(models.Product).get(id)
        if obj:
            # ProductHistory 功能已移除 - 以下代码已禁用
            # db.query(models.ProductHistory).filter(models.ProductHistory.product_id == id).delete()
            # 删除产品
            db.delete(obj)
            db.commit()
            return obj
    except Exception as e:
        db.rollback()
        logger.error(f"删除产品失败: {str(e)}")
        raise e

def remove(db: Session, *, id: int) -> models.Product:
    """
    删除产品
    """
    obj = db.query(models.Product).get(id)
    db.delete(obj)
    db.commit()
    return obj 