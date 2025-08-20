from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent.parent))

from app.core.config import settings

def test_local_connection():
    """测试本地数据库连接"""
    try:
        engine = create_engine(settings.get_database_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database(), current_user"))
            db, user = result.fetchone()
            print(f"本地数据库连接成功！当前数据库: {db}, 用户: {user}")
            
            # 检查表是否存在
            tables = conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ))
            print("\n本地数据库中的表:")
            for table in tables:
                print(f" - {table[0]}")
    except Exception as e:
        print(f"本地数据库连接测试失败: {e}")

def test_supabase_connection():
    """测试Supabase数据库连接"""
    try:
        supabase_url = os.getenv("SUPABASE_DB_URL")
        if not supabase_url:
            print("错误: 未设置SUPABASE_DB_URL环境变量")
            return
            
        engine = create_engine(supabase_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT current_database(), current_user"))
            db, user = result.fetchone()
            print(f"\nSupabase连接成功！当前数据库: {db}, 用户: {user}")
            
            # 检查表是否存在
            tables = conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ))
            print("\nSupabase数据库中的表:")
            for table in tables:
                print(f" - {table[0]}")
    except Exception as e:
        print(f"Supabase连接测试失败: {e}")

if __name__ == "__main__":
    print("开始测试数据库连接...\n")
    test_local_connection()
    test_supabase_connection()
    print("\n数据库连接测试完成！") 