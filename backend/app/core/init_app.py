import logging
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import User
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

def init_superadmin(db: Session) -> None:
    """
    初始化超级管理员账号
    """
    try:
        # 检查是否已存在超级管理员
        user = db.query(User).filter(User.email == settings.FIRST_SUPERADMIN).first()
        if not user:
            logger.info("创建默认超级管理员账号")
            
            superadmin = User(
                email=settings.FIRST_SUPERADMIN,
                hashed_password=get_password_hash(settings.FIRST_SUPERADMIN_PASSWORD),
                full_name="系统管理员",
                role="superadmin",
                is_active=True,
                is_superuser=True
            )
            
            db.add(superadmin)
            db.commit()
            logger.info(f"超级管理员账号创建成功: {settings.FIRST_SUPERADMIN}")
        else:
            logger.info("超级管理员账号已存在，跳过创建")
            
    except Exception as e:
        logger.error(f"创建超级管理员账号失败: {str(e)}")
        db.rollback() 