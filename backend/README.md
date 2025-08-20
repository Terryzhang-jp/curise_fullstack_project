# Cruise System Backend

这是一个基于FastAPI的船舶供应链管理系统后端。

## 功能特点

- 用户认证和授权
- 产品管理
- 订单管理
- 供应商管理
- 船舶管理
- 数据分析和报告

## 技术栈

- Python 3.9+
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- JWT认证

## 开发环境设置

1. 克隆仓库
```bash
git clone https://github.com/Terryzhang-jp/curise_db_backend.git
cd curise_db_backend
```

2. 创建虚拟环境
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate  # Windows
```

3. 安装依赖
```bash
pip install -r requirements.txt
```

4. 配置环境变量
```bash
cp .env.example .env
# 编辑.env文件，填入正确的配置信息
```

5. 运行数据库迁移
```bash
alembic upgrade head
```

6. 启动开发服务器
```bash
uvicorn app.main:app --reload
```

## API文档

启动服务器后，可以在以下地址查看API文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 部署

本项目可以部署到任何支持Python的平台。主要部署步骤：

1. 设置环境变量
2. 运行数据库迁移
3. 启动应用服务器

### Render部署

1. 在Render上创建新的Web Service
2. 连接GitHub仓库
3. 设置环境变量
4. 设置启动命令：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 开发指南

- 遵循PEP 8编码规范
- 所有新功能都需要添加测试
- 使用black进行代码格式化
- 使用flake8进行代码检查

## 测试

运行测试：
```bash
pytest
```

## 许可证

MIT License
