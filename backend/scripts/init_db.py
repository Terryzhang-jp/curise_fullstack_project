import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.core.config import settings

def init_db():
    db = SessionLocal()
    try:
        # 读取SQL文件
        with open(os.path.join(project_root, 'scripts', 'init_data.sql'), 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # 执行SQL语句
        db.execute(text(sql))
        db.commit()
        print("数据库初始化成功！")
    except Exception as e:
        print(f"数据库初始化失败：{str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 