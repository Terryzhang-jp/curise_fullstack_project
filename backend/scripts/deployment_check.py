#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
部署前检查脚本
用于验证环境配置和依赖项

使用方法:
python scripts/deployment_check.py
"""

import sys
import importlib
import subprocess
import os
from pathlib import Path

# 颜色输出
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"
UNDERLINE = "\033[4m"

def print_header(text):
    print(f"\n{BOLD}{BLUE}{text}{RESET}")
    print("=" * 60)

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}! {text}{RESET}")

def check_module_importable(module_name):
    try:
        importlib.import_module(module_name)
        print_success(f"模块 '{module_name}' 可以正常导入")
        return True
    except ImportError as e:
        print_error(f"模块 '{module_name}' 导入失败: {e}")
        return False

def get_installed_packages():
    """使用pip list命令获取已安装的包"""
    result = subprocess.run([sys.executable, "-m", "pip", "list", "--format=json"], 
                           stdout=subprocess.PIPE, text=True)
    
    if result.returncode != 0:
        print_error("无法获取已安装的包列表")
        return {}
    
    import json
    try:
        packages = json.loads(result.stdout)
        # 处理带下划线的包名，例如将email_validator转换为email-validator
        pkg_dict = {}
        for pkg in packages:
            name = pkg["name"].lower()
            # 同时添加带连字符和带下划线的版本
            pkg_dict[name] = pkg["version"]
            pkg_dict[name.replace("-", "_")] = pkg["version"]
            pkg_dict[name.replace("_", "-")] = pkg["version"]
            
        return pkg_dict
    except json.JSONDecodeError:
        print_error("无法解析pip list的输出")
        return {}

def check_requirements():
    print_header("检查 requirements.txt 中的依赖项")
    
    # 读取requirements.txt
    req_file = Path(__file__).parent.parent / "requirements.txt"
    if not req_file.exists():
        print_error(f"找不到requirements.txt文件: {req_file}")
        return False
    
    requirements = req_file.read_text().splitlines()
    requirements = [req for req in requirements if req and not req.startswith('#')]
    
    # 检查依赖
    all_satisfied = True
    installed_packages = get_installed_packages()
    
    print(f"找到 {len(requirements)} 个依赖项")
    
    critical_deps = [
        'pydantic-settings',
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        'psycopg2-binary'
    ]
    
    for req_line in requirements:
        try:
            # 简单解析，处理[extras]情况
            req_name = req_line.split('==')[0].split('[')[0].strip().lower()
            req_version = req_line.split('==')[1].strip() if '==' in req_line else "未指定"
            
            if req_name in installed_packages:
                inst_version = installed_packages[req_name]
                if req_name in critical_deps:
                    print_success(f"{req_name} - 已安装 (版本: {inst_version})")
                else:
                    print(f"  {req_name} - 已安装 (版本: {inst_version})")
            else:
                print_error(f"{req_name} - 未安装 (所需版本: {req_version})")
                all_satisfied = False
                
        except Exception as e:
            print_warning(f"无法检查 {req_line}: {e}")
    
    return all_satisfied

def check_critical_imports():
    print_header("检查关键模块导入")
    
    critical_modules = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "pydantic_settings",
        "jose",
        "passlib",
        "alembic",
        "psycopg2",
        "dotenv",
        "email_validator"
    ]
    
    all_passed = True
    for module in critical_modules:
        if not check_module_importable(module):
            all_passed = False
    
    return all_passed

def check_environment_vars():
    print_header("检查环境变量")
    
    required_vars = [
        "POSTGRES_SERVER",
        "POSTGRES_USER", 
        "POSTGRES_PASSWORD",
        "POSTGRES_DB"
    ]
    
    from dotenv import load_dotenv
    load_dotenv()
    
    all_set = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # 对于密码，隐藏具体内容
            if "PASSWORD" in var:
                display_val = "********"
            else:
                display_val = value
            print_success(f"{var}: {display_val}")
        else:
            print_error(f"{var}: 未设置")
            all_set = False
    
    return all_set

def main():
    print_header("App Engine 部署检查工具")
    print(f"{BOLD}Python 版本: {sys.version}{RESET}")
    
    # 运行各项检查
    deps_ok = check_requirements()
    imports_ok = check_critical_imports()
    env_ok = check_environment_vars()
    
    # 汇总结果
    print_header("检查结果")
    
    if deps_ok and imports_ok and env_ok:
        print(f"{BOLD}{GREEN}所有检查通过！应用程序准备好部署到 App Engine.{RESET}")
    else:
        print(f"{BOLD}{RED}部署检查未通过. 请修复上述问题后再尝试部署.{RESET}")

if __name__ == "__main__":
    main() 