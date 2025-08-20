#!/usr/bin/env python3
"""
系统功能测试脚本
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.db.base import Base

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """测试数据库连接"""
    try:
        database_url = settings.SUPABASE_DB_URL or settings.SQLALCHEMY_DATABASE_URI or f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}/{settings.POSTGRES_DB}"
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.scalar()
            logger.info(f"✅ 数据库连接成功: {version}")
            
            # 检查表
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            
            tables = [table[0] for table in result.fetchall()]
            logger.info(f"✅ 发现 {len(tables)} 个表: {', '.join(tables)}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {e}")
        return False

def test_model_imports():
    """测试模型导入"""
    try:
        from app.models.models import (
            User, Country, Port, Company, Ship,
            Category, SupplierCategory, Product, Supplier,
            Order, OrderItem, FileUpload, CruiseOrder, CruiseOrderItem,
            EmailTemplate
        )
        
        # 检查所有模型的表名
        models = [
            User, Country, Port, Company, Ship,
            Category, SupplierCategory, Product, Supplier,
            Order, OrderItem, FileUpload, CruiseOrder, CruiseOrderItem,
            EmailTemplate
        ]
        
        table_names = []
        for model in models:
            if hasattr(model, '__tablename__'):
                table_names.append(model.__tablename__)
        
        logger.info(f"✅ 模型导入成功，包含 {len(table_names)} 个表模型")
        logger.info(f"   表名: {', '.join(table_names)}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 模型导入失败: {e}")
        return False

def test_api_imports():
    """测试API端点导入"""
    try:
        from app.api.api_v1.endpoints import (
            orders, products, countries, categories, suppliers,
            ships, companies, ports, email_templates, auth, users,
            health, dashboard, cruise_orders, product_suppliers
        )
        
        logger.info("✅ API端点导入成功")
        return True
        
    except Exception as e:
        logger.error(f"❌ API端点导入失败: {e}")
        return False

def test_app_startup():
    """测试应用启动"""
    try:
        from app.main import app
        logger.info("✅ FastAPI应用创建成功")
        return True
        
    except Exception as e:
        logger.error(f"❌ FastAPI应用创建失败: {e}")
        return False

def main():
    """运行所有测试"""
    logger.info("=== 系统功能测试 ===")
    
    tests = [
        ("数据库连接", test_database_connection),
        ("模型导入", test_model_imports),
        ("API导入", test_api_imports),
        ("应用启动", test_app_startup)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info(f"\n--- 测试: {test_name} ---")
        result = test_func()
        results.append((test_name, result))
    
    # 汇总结果
    logger.info("\n=== 测试结果汇总 ===")
    passed = 0
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\n总计: {passed}/{len(tests)} 项测试通过")
    
    if passed == len(tests):
        logger.info("🎉 所有测试通过！系统运行正常。")
        return True
    else:
        logger.error("⚠️  存在测试失败，请检查相关功能。")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)