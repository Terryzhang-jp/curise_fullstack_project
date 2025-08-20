from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from sqlalchemy import text

router = APIRouter()

@router.get("/")
async def health_check():
    """
    基本健康检查接口，不需要数据库连接
    """
    return {"status": "ok", "message": "服务运行正常"}

@router.get("/db")
async def database_health_check(db: Session = Depends(get_db)):
    """
    数据库健康检查接口，验证数据库连接是否正常
    """
    try:
        # 尝试执行简单的SQL查询
        result = db.execute(text("SELECT 1")).fetchone()
        if result and result[0] == 1:
            return {
                "status": "ok", 
                "message": "数据库连接正常",
                "database": "PostgreSQL on Google Cloud SQL"
            }
        return {"status": "error", "message": "数据库查询结果异常"}
    except Exception as e:
        return {"status": "error", "message": f"数据库连接异常: {str(e)}"} 