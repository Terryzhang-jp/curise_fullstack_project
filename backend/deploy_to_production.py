#!/usr/bin/env python3
"""
生产环境部署脚本
1. 从本地数据库导出数据到Supabase
2. 验证数据完整性
3. 准备生产环境配置
"""

import os
import sys
import json
from datetime import datetime
from sqlalchemy import create_engine, text
import requests

def log(message, level="INFO"):
    """日志输出"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def check_local_database():
    """检查本地数据库连接和数据"""
    log("检查本地数据库...")
    
    try:
        local_db_url = 'postgresql://postgres:Qaz961264727@localhost/cruise_system_development'
        local_engine = create_engine(local_db_url)
        
        with local_engine.connect() as conn:
            # 检查关键表的数据量
            tables_to_check = ['users', 'products', 'suppliers', 'categories', 'countries']
            data_summary = {}
            
            for table in tables_to_check:
                result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
                count = result.fetchone()[0]
                data_summary[table] = count
                log(f"  {table}: {count} 条记录")
            
            return data_summary
            
    except Exception as e:
        log(f"本地数据库连接失败: {e}", "ERROR")
        return None

def export_table_data(table_name, columns=None):
    """导出表数据为INSERT语句"""
    log(f"导出 {table_name} 表数据...")
    
    try:
        local_db_url = 'postgresql://postgres:Qaz961264727@localhost/cruise_system_development'
        local_engine = create_engine(local_db_url)
        
        with local_engine.connect() as conn:
            if columns:
                column_list = ', '.join(columns)
                query = f'SELECT {column_list} FROM {table_name} ORDER BY id'
            else:
                query = f'SELECT * FROM {table_name} ORDER BY id'
            
            result = conn.execute(text(query))
            rows = result.fetchall()
            
            if not rows:
                log(f"  {table_name} 表为空")
                return []
            
            # 获取列名
            if columns:
                col_names = columns
            else:
                # 获取表结构
                schema_result = conn.execute(text(f'''
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    ORDER BY ordinal_position
                '''))
                col_names = [row[0] for row in schema_result.fetchall()]
            
            # 生成INSERT语句
            insert_statements = []
            for row in rows:
                values = []
                for val in row:
                    if val is None:
                        values.append('NULL')
                    elif isinstance(val, str):
                        # 转义单引号
                        escaped_val = val.replace("'", "''")
                        values.append(f"'{escaped_val}'")
                    elif isinstance(val, bool):
                        values.append('true' if val else 'false')
                    elif isinstance(val, datetime):
                        values.append(f"'{val.isoformat()}'")
                    else:
                        values.append(str(val))
                
                columns_str = ', '.join(col_names)
                values_str = ', '.join(values)
                insert_stmt = f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});"
                insert_statements.append(insert_stmt)
            
            log(f"  导出 {len(insert_statements)} 条 {table_name} 记录")
            return insert_statements
            
    except Exception as e:
        log(f"导出 {table_name} 失败: {e}", "ERROR")
        return []

def create_migration_script():
    """创建完整的数据迁移脚本"""
    log("创建数据迁移脚本...")
    
    # 定义要迁移的表和字段
    tables_to_migrate = {
        'countries': ['name', 'code', 'status', 'created_at', 'updated_at'],
        'categories': ['name', 'description', 'status', 'created_at', 'updated_at'],
        'suppliers': ['name', 'contact', 'email', 'phone', 'address', 'status', 'created_at', 'updated_at'],
        'products': [
            'product_name_en', 'product_name_jp', 'code', 'country_id', 'category_id', 
            'supplier_id', 'port_id', 'unit', 'price', 'unit_size', 'pack_size', 
            'country_of_origin', 'brand', 'currency', 'effective_from', 'effective_to', 
            'status', 'created_at', 'updated_at'
        ]
    }
    
    migration_script = []
    migration_script.append("-- 生产环境数据迁移脚本")
    migration_script.append(f"-- 生成时间: {datetime.now().isoformat()}")
    migration_script.append("-- 注意: 此脚本将清空现有数据并重新导入")
    migration_script.append("")
    
    # 按依赖顺序迁移表
    for table_name, columns in tables_to_migrate.items():
        migration_script.append(f"-- 迁移 {table_name} 表")
        migration_script.append(f"DELETE FROM {table_name};")
        migration_script.append(f"ALTER SEQUENCE {table_name}_id_seq RESTART WITH 1;")
        migration_script.append("")
        
        # 导出数据
        insert_statements = export_table_data(table_name, columns)
        migration_script.extend(insert_statements)
        migration_script.append("")
    
    # 保存到文件
    script_content = '\n'.join(migration_script)
    with open('production_migration.sql', 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    log(f"✅ 迁移脚本已保存到 production_migration.sql")
    return 'production_migration.sql'

def test_supabase_connection():
    """测试Supabase连接"""
    log("测试Supabase连接...")
    
    try:
        from app.core.config import settings
        from app.db.session import SessionLocal
        
        # 测试连接
        db = SessionLocal()
        result = db.execute(text('SELECT version()'))
        version = result.fetchone()[0]
        log(f"✅ Supabase连接成功!")
        log(f"  PostgreSQL版本: {version.split(',')[0]}")
        
        # 检查表
        result = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
        tables = [row[0] for row in result.fetchall()]
        log(f"  找到 {len(tables)} 个表: {', '.join(tables)}")
        
        db.close()
        return True
        
    except Exception as e:
        log(f"❌ Supabase连接失败: {e}", "ERROR")
        return False

def create_production_env():
    """创建生产环境配置文件"""
    log("创建生产环境配置...")
    
    production_config = """# 生产环境配置
ENV=production

# Supabase数据库连接
SUPABASE_DB_URL=postgresql://postgres.yczgwmbnjomhrvxtuupt:Qaz2465672485@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
SUPABASE_URL=https://yczgwmbnjomhrvxtuupt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljemd3bWJuam9taHJ2eHR1dXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2NjQ3NjMsImV4cCI6MjA1OTI0MDc2M30.IGGBZhIXwoCPyN7gUjQIbn2tSfA-SSB9EnPWCH_cWbI

# JWT设置
SECRET_KEY=pdT0M5o4lzSXK6ZxUQsaA2WDI9YjN3cF1hkLrVgwOPeJ

# 默认超级管理员
FIRST_SUPERADMIN=admin@example.com
FIRST_SUPERADMIN_PASSWORD=adminpassword

# SMTP设置（生产环境需要配置真实邮箱）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
"""
    
    with open('.env.production', 'w', encoding='utf-8') as f:
        f.write(production_config)
    
    log("✅ 生产环境配置已保存到 .env.production")

def create_docker_files():
    """创建Docker部署文件"""
    log("创建Docker部署文件...")
    
    # Dockerfile
    dockerfile_content = """FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \\
    gcc \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 设置环境变量
ENV PYTHONPATH=/app
ENV PORT=8080

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
"""
    
    with open('Dockerfile', 'w') as f:
        f.write(dockerfile_content)
    
    # .dockerignore
    dockerignore_content = """__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
.venv
venv/
.env
.env.local
.env.development
uploads/
logs/
test.db
*.sql
docs/
scripts/
tests/
"""
    
    with open('.dockerignore', 'w') as f:
        f.write(dockerignore_content)
    
    log("✅ Docker文件已创建")

def main():
    """主函数"""
    log("🚀 开始生产环境部署准备...")
    
    # 1. 检查本地数据库
    local_data = check_local_database()
    if not local_data:
        log("本地数据库检查失败，退出", "ERROR")
        return False
    
    # 2. 测试Supabase连接
    if not test_supabase_connection():
        log("Supabase连接失败，退出", "ERROR")
        return False
    
    # 3. 创建数据迁移脚本
    migration_file = create_migration_script()
    
    # 4. 创建生产环境配置
    create_production_env()
    
    # 5. 创建Docker文件
    create_docker_files()
    
    log("✅ 生产环境准备完成!")
    log("📋 下一步操作:")
    log("  1. 执行数据迁移: 使用Supabase MCP执行 production_migration.sql")
    log("  2. 构建Docker镜像: docker build -t cruise-backend .")
    log("  3. 部署到Google Cloud Run")
    log("  4. 部署前端到Vercel")
    
    return True

if __name__ == "__main__":
    main()
