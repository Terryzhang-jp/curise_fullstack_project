#!/usr/bin/env python3
"""
系统初始化脚本
"""
import os
import sys

# 添加项目路径到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.models.models import User

def init_system():
    """初始化系统"""
    db: Session = SessionLocal()
    
    try:
        print("正在初始化系统...")
        
        # 1. 检查数据库连接
        try:
            # 尝试查询一个用户
            test_query = db.query(User).first()
            print("✓ 数据库连接正常")
        except Exception as e:
            print(f"✗ 数据库连接失败: {str(e)}")
            return
        
        # 2. 创建默认管理员用户
        existing_admin = user.get_by_email(db, email="admin@example.com")
        if existing_admin:
            print("✓ 管理员用户已存在")
            print(f"  邮箱: {existing_admin.email}")
            print(f"  角色: {existing_admin.role}")
            print(f"  激活状态: {existing_admin.is_active}")
        else:
            try:
                user_data = UserCreate(
                    email="admin@example.com",
                    password="admin123",
                    full_name="系统管理员",
                    role="superadmin",
                    is_active=True
                )
                
                new_user = user.create(db, obj_in=user_data)
                print("✓ 成功创建管理员用户")
                print(f"  邮箱: {new_user.email}")
                print(f"  密码: admin123")
                print(f"  角色: {new_user.role}")
            except Exception as e:
                print(f"✗ 创建管理员用户失败: {str(e)}")
        
        # 3. 检查其他必要表
        from app.models.models import Country, Category, Company
        
        country_count = db.query(Country).count()
        category_count = db.query(Category).count()
        company_count = db.query(Company).count()
        
        print(f"✓ 数据库状态检查:")
        print(f"  国家数量: {country_count}")
        print(f"  分类数量: {category_count}")
        print(f"  公司数量: {company_count}")
        
        print("\n系统初始化完成!")
        print("\n前端访问地址: http://localhost:3000")
        print("API文档地址: http://localhost:8000/docs")
        print("\n登录信息:")
        print("  邮箱: admin@example.com")
        print("  密码: admin123")
        
    except Exception as e:
        print(f"系统初始化失败: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    init_system()