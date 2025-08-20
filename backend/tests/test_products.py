import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import pandas as pd
import os
import io
import tempfile
from app.models.models import Product as ProductModel

# 测试产品API
def test_create_product(client: TestClient, db: Session):
    # 获取已存在的依赖数据：国家、类别、供应商和港口
    # 获取国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 获取类别
    category_response = client.get("/api/v1/categories/")
    assert category_response.status_code == 200
    categories = category_response.json()
    if len(categories) == 0:
        # 如果没有类别，创建一个
        category_data = {"name": "测试类别", "code": "CAT", "description": "测试描述", "status": True}
        category_response = client.post("/api/v1/categories/", json=category_data)
        assert category_response.status_code == 200
        category_id = category_response.json()["id"]
    else:
        category_id = categories[0]["id"]  # 使用第一个类别

    # 获取供应商
    supplier_response = client.get("/api/v1/suppliers/")
    assert supplier_response.status_code == 200
    suppliers = supplier_response.json()
    if len(suppliers) == 0:
        # 如果没有供应商，创建一个
        supplier_data = {
            "name": "测试供应商",
            "country_id": country_id,
            "contact": "测试联系人",
            "email": "test@example.com",
            "phone": "12345678901",
            "status": True
        }
        supplier_response = client.post("/api/v1/suppliers/", json=supplier_data)
        assert supplier_response.status_code == 200
        supplier_id = supplier_response.json()["id"]
    else:
        supplier_id = suppliers[0]["id"]  # 使用第一个供应商

    # 获取港口
    port_response = client.get("/api/v1/ports/")
    assert port_response.status_code == 200
    ports = port_response.json()
    if len(ports) == 0:
        # 如果没有港口，创建一个
        port_data = {
            "name": "测试港口",
            "code": "TST-PORT",
            "country_id": country_id,
            "location": "测试位置",
            "status": True
        }
        port_response = client.post("/api/v1/ports/", json=port_data)
        assert port_response.status_code == 200
        port_id = port_response.json()["id"]
    else:
        port_id = ports[0]["id"]  # 使用第一个港口

    # 测试创建产品 - 使用随机名称和代码避免冲突
    import random
    import string
    import time

    # 生成随机字符串
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    timestamp = int(time.time())

    product_data = {
        "product_name_en": f"Test Product {random_str}",
        "product_name_jp": f"テスト製品 {random_str}",
        "code": f"PRD-{timestamp}",
        "category_id": category_id,
        "country_id": country_id,
        "supplier_id": supplier_id,
        "port_id": port_id,
        "unit": "个",
        "price": 100.0,
        "unit_size": "500g",
        "pack_size": 10,
        "country_of_origin": "中国",
        "brand": "测试品牌",
        "currency": "CNY",
        "status": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    assert response.status_code == 200
    data = response.json()
    assert data["product_name_en"] == product_data["product_name_en"]
    assert data["product_name_jp"] == product_data["product_name_jp"]
    assert data["code"] == product_data["code"]
    assert data["category_id"] == product_data["category_id"]
    assert data["country_id"] == product_data["country_id"]
    assert data["supplier_id"] == product_data["supplier_id"]
    assert data["port_id"] == product_data["port_id"]
    assert data["unit"] == product_data["unit"]
    assert float(data["price"]) == product_data["price"]
    assert data["unit_size"] == product_data["unit_size"]
    assert data["pack_size"] == product_data["pack_size"]
    assert data["country_of_origin"] == product_data["country_of_origin"]
    assert data["brand"] == product_data["brand"]
    assert data["currency"] == product_data["currency"]
    assert "id" in data

    # 测试创建重复代码的产品（应该失败）
    response = client.post("/api/v1/products/", json=product_data)
    assert response.status_code == 400

    # 测试创建同名但不同国家的产品（应该成功）
    product_data2 = product_data.copy()
    product_data2["code"] = f"PRD-{timestamp+1}"  # 使用不同的代码

    # 获取另一个国家（如果有多个国家）
    if len(countries) > 1:
        country_id2 = countries[1]["id"]  # 使用第二个国家
    else:
        # 如果只有一个国家，就继续使用第一个国家
        country_id2 = country_id

    product_data2["country_id"] = country_id2
    response = client.post("/api/v1/products/", json=product_data2)
    assert response.status_code == 200

def test_read_products(client: TestClient, db: Session):
    # 先创建依赖数据：国家、类别、供应商和港口
    # 创建国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]

    # 创建类别
    category_data1 = {"name": "测试类别1", "code": "CAT1", "description": "描述1", "status": True}
    category_data2 = {"name": "测试类别2", "code": "CAT2", "description": "描述2", "status": True}

    category_response1 = client.post("/api/v1/categories/", json=category_data1)
    category_response2 = client.post("/api/v1/categories/", json=category_data2)

    category_id1 = category_response1.json()["id"]
    category_id2 = category_response2.json()["id"]

    # 创建供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    supplier_response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = supplier_response.json()["id"]

    # 创建港口
    port_data = {
        "name": "测试港口",
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    port_response = client.post("/api/v1/ports/", json=port_data)
    port_id = port_response.json()["id"]

    # 创建一些测试产品
    product_data = [
        {
            "product_name_en": "Test Product 1",
            "code": "PRD-101",
            "category_id": category_id1,
            "country_id": country_id,
            "supplier_id": supplier_id,
            "port_id": port_id,
            "price": 100.0,
            "status": True
        },
        {
            "product_name_en": "Test Product 2",
            "code": "PRD-102",
            "category_id": category_id1,
            "country_id": country_id,
            "supplier_id": supplier_id,
            "port_id": port_id,
            "price": 200.0,
            "status": True
        },
        {
            "product_name_en": "Test Product 3",
            "code": "PRD-103",
            "category_id": category_id2,
            "country_id": country_id,
            "supplier_id": supplier_id,
            "port_id": port_id,
            "price": 300.0,
            "status": False
        }
    ]

    for product in product_data:
        client.post("/api/v1/products/", json=product)

    # 测试获取产品列表
    response = client.get("/api/v1/products/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # 可能有之前测试创建的产品

    # 测试分页
    response = client.get("/api/v1/products/?skip=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

    # 测试按类别筛选
    response = client.get(f"/api/v1/products/?category_id={category_id1}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2  # 至少有两个该类别的产品

    # 测试按国家筛选
    response = client.get(f"/api/v1/products/?country_id={country_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # 至少有三个该国家的产品

def test_search_products(client: TestClient, db: Session):
    # 先创建依赖数据：国家、类别、供应商和港口
    # 创建国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]

    # 创建类别
    category_data = {"name": "测试类别", "code": "CAT", "description": "测试描述", "status": True}
    category_response = client.post("/api/v1/categories/", json=category_data)
    category_id = category_response.json()["id"]

    # 创建供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    supplier_response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = supplier_response.json()["id"]

    # 创建港口
    port_data = {
        "name": "测试港口",
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    port_response = client.post("/api/v1/ports/", json=port_data)
    port_id = port_response.json()["id"]

    # 创建一些测试产品
    product_data = [
        {
            "product_name_en": "Apple Juice",
            "code": "AJ-001",
            "category_id": category_id,
            "country_id": country_id,
            "supplier_id": supplier_id,
            "port_id": port_id,
            "price": 100.0,
            "status": True
        },
        {
            "product_name_en": "Orange Juice",
            "code": "OJ-001",
            "category_id": category_id,
            "country_id": country_id,
            "supplier_id": supplier_id,
            "port_id": port_id,
            "price": 200.0,
            "status": True
        },
        {
            "product_name_en": "Grape Wine",
            "code": "GW-001",
            "category_id": category_id,
            "country_id": country_id,
            "supplier_id": supplier_id,
            "port_id": port_id,
            "price": 300.0,
            "status": True
        }
    ]

    for product in product_data:
        client.post("/api/v1/products/", json=product)

    # 测试按名称搜索
    response = client.get("/api/v1/products/search?product_name_en=Juice")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2  # 应该找到两个含有"Juice"的产品

    # 测试按代码搜索
    response = client.get("/api/v1/products/search?code=AJ")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1  # 应该找到一个代码含有"AJ"的产品

    # 测试按类别搜索
    response = client.get(f"/api/v1/products/search?category_id={category_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3  # 应该找到三个该类别的产品

    # 测试按供应商搜索
    response = client.get(f"/api/v1/products/search?supplier_id={supplier_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3  # 应该找到三个该供应商的产品

    # 测试组合搜索
    response = client.get(f"/api/v1/products/search?product_name_en=Juice&supplier_id={supplier_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2  # 应该找到两个含有"Juice"且属于该供应商的产品

def test_read_product(client: TestClient, db: Session):
    # 先创建依赖数据：国家、类别、供应商和港口
    # 创建国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]

    # 创建类别
    category_data = {"name": "测试类别", "code": "CAT", "description": "测试描述", "status": True}
    category_response = client.post("/api/v1/categories/", json=category_data)
    category_id = category_response.json()["id"]

    # 创建供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    supplier_response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = supplier_response.json()["id"]

    # 创建港口
    port_data = {
        "name": "测试港口",
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    port_response = client.post("/api/v1/ports/", json=port_data)
    port_id = port_response.json()["id"]

    # 创建一个测试产品
    product_data = {
        "product_name_en": "Test Product",
        "product_name_jp": "テスト製品",
        "code": "PRD-001",
        "category_id": category_id,
        "country_id": country_id,
        "supplier_id": supplier_id,
        "port_id": port_id,
        "unit": "个",
        "price": 100.0,
        "unit_size": "500g",
        "pack_size": 10,
        "country_of_origin": "中国",
        "brand": "测试品牌",
        "currency": "CNY",
        "status": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product_id = response.json()["id"]

    # 测试获取特定产品
    response = client.get(f"/api/v1/products/{product_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["product_name_en"] == product_data["product_name_en"]
    assert data["product_name_jp"] == product_data["product_name_jp"]
    assert data["code"] == product_data["code"]
    assert data["category_id"] == product_data["category_id"]
    assert data["country_id"] == product_data["country_id"]
    assert data["supplier_id"] == product_data["supplier_id"]
    assert data["port_id"] == product_data["port_id"]

    # 测试获取不存在的产品
    response = client.get("/api/v1/products/999")
    assert response.status_code == 404

def test_update_product(client: TestClient, db: Session):
    # 先创建依赖数据：国家、类别、供应商和港口
    # 创建国家
    country_data1 = {"name": "测试国家1", "code": "TS1", "status": True}
    country_data2 = {"name": "测试国家2", "code": "TS2", "status": True}

    country_response1 = client.post("/api/v1/countries/", json=country_data1)
    country_response2 = client.post("/api/v1/countries/", json=country_data2)

    country_id1 = country_response1.json()["id"]
    country_id2 = country_response2.json()["id"]

    # 创建类别
    category_data1 = {"name": "测试类别1", "code": "CAT1", "description": "描述1", "status": True}
    category_data2 = {"name": "测试类别2", "code": "CAT2", "description": "描述2", "status": True}

    category_response1 = client.post("/api/v1/categories/", json=category_data1)
    category_response2 = client.post("/api/v1/categories/", json=category_data2)

    category_id1 = category_response1.json()["id"]
    category_id2 = category_response2.json()["id"]

    # 创建供应商
    supplier_data1 = {
        "name": "测试供应商1",
        "country_id": country_id1,
        "contact": "测试联系人1",
        "email": "test1@example.com",
        "phone": "12345678901",
        "status": True
    }
    supplier_data2 = {
        "name": "测试供应商2",
        "country_id": country_id1,
        "contact": "测试联系人2",
        "email": "test2@example.com",
        "phone": "12345678902",
        "status": True
    }

    supplier_response1 = client.post("/api/v1/suppliers/", json=supplier_data1)
    supplier_response2 = client.post("/api/v1/suppliers/", json=supplier_data2)

    supplier_id1 = supplier_response1.json()["id"]
    supplier_id2 = supplier_response2.json()["id"]

    # 创建港口
    port_data1 = {
        "name": "测试港口1",
        "code": "TST-PORT1",
        "country_id": country_id1,
        "location": "测试位置1",
        "status": True
    }
    port_data2 = {
        "name": "测试港口2",
        "code": "TST-PORT2",
        "country_id": country_id2,
        "location": "测试位置2",
        "status": True
    }

    port_response1 = client.post("/api/v1/ports/", json=port_data1)
    port_response2 = client.post("/api/v1/ports/", json=port_data2)

    port_id1 = port_response1.json()["id"]
    port_id2 = port_response2.json()["id"]

    # 创建一个测试产品
    product_data = {
        "product_name_en": "Test Product",
        "product_name_jp": "テスト製品",
        "code": "PRD-001",
        "category_id": category_id1,
        "country_id": country_id1,
        "supplier_id": supplier_id1,
        "port_id": port_id1,
        "unit": "个",
        "price": 100.0,
        "unit_size": "500g",
        "pack_size": 10,
        "country_of_origin": "中国",
        "brand": "测试品牌",
        "currency": "CNY",
        "status": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product_id = response.json()["id"]

    # 测试更新产品
    update_data = {
        "product_name_en": "Updated Product",
        "product_name_jp": "更新された製品",
        "code": "PRD-001-UPD",
        "category_id": category_id2,
        "country_id": country_id2,
        "supplier_id": supplier_id2,
        "port_id": port_id2,
        "unit": "箱",
        "price": 200.0,
        "unit_size": "1kg",
        "pack_size": 20,
        "country_of_origin": "日本",
        "brand": "更新品牌",
        "currency": "JPY",
        "status": False
    }
    response = client.put(f"/api/v1/products/{product_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["product_name_en"] == update_data["product_name_en"]
    assert data["product_name_jp"] == update_data["product_name_jp"]
    assert data["code"] == update_data["code"]
    assert data["category_id"] == update_data["category_id"]
    assert data["country_id"] == update_data["country_id"]
    assert data["supplier_id"] == update_data["supplier_id"]
    assert data["port_id"] == update_data["port_id"]
    assert data["unit"] == update_data["unit"]
    assert float(data["price"]) == update_data["price"]
    assert data["unit_size"] == update_data["unit_size"]
    assert data["pack_size"] == update_data["pack_size"]
    assert data["country_of_origin"] == update_data["country_of_origin"]
    assert data["brand"] == update_data["brand"]
    assert data["currency"] == update_data["currency"]
    assert data["status"] == update_data["status"]

    # 测试更新不存在的产品
    response = client.put("/api/v1/products/999", json=update_data)
    assert response.status_code == 404

def test_delete_product(client: TestClient, db: Session):
    # 先创建依赖数据：国家、类别、供应商和港口
    # 创建国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]

    # 创建类别
    category_data = {"name": "测试类别", "code": "CAT", "description": "测试描述", "status": True}
    category_response = client.post("/api/v1/categories/", json=category_data)
    category_id = category_response.json()["id"]

    # 创建供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    supplier_response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = supplier_response.json()["id"]

    # 创建港口
    port_data = {
        "name": "测试港口",
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    port_response = client.post("/api/v1/ports/", json=port_data)
    port_id = port_response.json()["id"]

    # 创建一个测试产品
    product_data = {
        "product_name_en": "Test Product",
        "code": "PRD-001",
        "category_id": category_id,
        "country_id": country_id,
        "supplier_id": supplier_id,
        "port_id": port_id,
        "price": 100.0,
        "status": True
    }
    response = client.post("/api/v1/products/", json=product_data)
    product_id = response.json()["id"]

    # 测试删除产品
    response = client.delete(f"/api/v1/products/{product_id}")
    assert response.status_code == 200

    # 确认产品已被删除
    response = client.get(f"/api/v1/products/{product_id}")
    assert response.status_code == 404

    # 测试删除不存在的产品
    response = client.delete("/api/v1/products/999")
    assert response.status_code == 404

def test_upload_products(client: TestClient, db: Session):
    """测试批量导入产品功能"""
    # 获取已存在的依赖数据：国家、类别、供应商和港口
    # 获取国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 获取类别
    category_response = client.get("/api/v1/categories/")
    assert category_response.status_code == 200
    categories = category_response.json()
    assert len(categories) > 0, "数据库中没有类别数据，请先创建类别"
    category_id = categories[0]["id"]  # 使用第一个类别

    # 新的API不需要supplier_id和port_id参数

    # 创建测试数据
    import random
    import string
    import time

    # 生成随机字符串，确保产品名称唯一
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    timestamp = int(time.time())

    # 创建测试数据DataFrame
    test_data = {
        'product_name_en': [
            f"Bulk Test Product 1 {random_str}",
            f"Bulk Test Product 2 {random_str}",
            f"Bulk Test Product 3 {random_str}"
        ],
        'product_name_jp': [
            f"一括テスト製品1 {random_str}",
            f"一括テスト製品2 {random_str}",
            f"一括テスト製品3 {random_str}"
        ],
        'code': [
            f"BULK-{timestamp}-1",
            f"BULK-{timestamp}-2",
            f"BULK-{timestamp}-3"
        ],
        'category_name': [categories[0]["name"], categories[0]["name"], categories[0]["name"]],
        'country_name': [countries[0]["name"], countries[0]["name"], countries[0]["name"]],
        'effective_from': ['2023-01-01', '2023-01-01', '2023-01-01'],
        'unit': ['个', '箱', '件'],
        'price': [100.0, 200.0, 300.0],
        'unit_size': ['500g', '1kg', '2kg'],
        'pack_size': [10, 20, 30],
        'country_of_origin': ['中国', '日本', '韩国'],
        'brand': ['测试品牌1', '测试品牌2', '测试品牌3'],
        'currency': ['CNY', 'JPY', 'KRW'],
        'status': [True, True, False]
    }

    df = pd.DataFrame(test_data)

    # 创建临时Excel文件
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        df.to_excel(tmp.name, index=False)
        tmp_path = tmp.name

    try:
        # 打开文件并准备上传
        with open(tmp_path, 'rb') as f:
            files = {'file': ('test_products.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            data = {
                'supplier_id': str(supplier_id),
                'port_id': str(port_id)
            }

            # 上传文件 - 使用新的API端点
            response = client.post(
                "/api/v1/file-upload/products/upload-simple",
                files=files,
                data={'upload_id': 'test_upload_123'}
            )

            # 验证响应 - 新API返回统计信息而不是产品列表
            assert response.status_code == 200
            result = response.json()
            assert "success_count" in result
            assert "error_count" in result
            assert "skipped_count" in result
            assert result["success_count"] == 3
            assert result["error_count"] == 0

            # 验证产品是否真的被创建了 - 通过查询API验证
            products_response = client.get("/api/v1/products/")
            assert products_response.status_code == 200
            all_products = products_response.json()

            # 查找我们刚上传的产品
            uploaded_products = [p for p in all_products if random_str in p["product_name_en"]]
            assert len(uploaded_products) == 3

            # 测试上传格式错误的文件
            with open(__file__, 'rb') as f:
                files = {'file': ('test.py', f, 'text/plain')}
                response = client.post(
                    "/api/v1/products/upload",
                    files=files,
                    data=data
                )
                assert response.status_code == 400

    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

        # 清理创建的产品数据
        for code in test_data["code"]:
            # 查找产品ID
            product = db.query(ProductModel).filter_by(code=code).first()
            if product:
                # 删除产品
                db.delete(product)
        db.commit()
