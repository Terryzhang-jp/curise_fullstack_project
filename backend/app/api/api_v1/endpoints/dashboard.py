from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import dashboard

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
):
    """
    获取仪表盘统计数据
    """
    return dashboard.get_dashboard_stats(db) 