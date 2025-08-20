import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 测试供应商API
def test_create_supplier(client: TestClient, db: Session):
    # 获取已存在的国家，而不是创建新国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 获取已存在的类别，而不是创建新类别
    category_response = client.get("/api/v1/categories/")
    assert category_response.status_code == 200
    categories = category_response.json()
    if len(categories) < 2:
        # 如果类别不足两个，创建所需的类别
        for i in range(2 - len(categories)):
            # 使用随机代码避免冲突
            import random
            random_code = f"CAT-{random.randint(1000, 9999)}"
            category_data = {
                "name": f"测试类别{random_code}",
                "code": random_code,
                "description": f"描述{random_code}",
                "status": True
            }
            response = client.post("/api/v1/categories/", json=category_data)
            assert response.status_code == 200

        # 重新获取类别列表
        category_response = client.get("/api/v1/categories/")
        assert category_response.status_code == 200
        categories = category_response.json()

    assert len(categories) >= 2, "数据库中至少需要两个类别数据"
    category_id1 = categories[0]["id"]  # 使用第一个类别
    category_id2 = categories[1]["id"]  # 使用第二个类别

    # 测试创建供应商（不带类别）
    supplier_data = {
        "name": "测试供应商1",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/suppliers/", json=supplier_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == supplier_data["name"]
    assert data["country_id"] == supplier_data["country_id"]
    assert data["contact"] == supplier_data["contact"]
    assert data["email"] == supplier_data["email"]
    assert data["phone"] == supplier_data["phone"]
    assert "id" in data

    # 测试创建供应商（带类别）
    supplier_data_with_categories = {
        "name": "测试供应商2",
        "country_id": country_id,
        "contact": "测试联系人2",
        "email": "test2@example.com",
        "phone": "12345678902",
        "status": True,
        "category_ids": [category_id1, category_id2]
    }
    response = client.post("/api/v1/suppliers/", json=supplier_data_with_categories)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == supplier_data_with_categories["name"]
    assert data["country_id"] == supplier_data_with_categories["country_id"]
    assert "id" in data

def test_read_suppliers(client: TestClient, db: Session):
    # 获取已存在的国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 创建一些测试供应商
    supplier_data = [
        {
            "name": "测试供应商1",
            "country_id": country_id,
            "contact": "联系人1",
            "email": "test1@example.com",
            "phone": "12345678901",
            "status": True
        },
        {
            "name": "测试供应商2",
            "country_id": country_id,
            "contact": "联系人2",
            "email": "test2@example.com",
            "phone": "12345678902",
            "status": True
        },
        {
            "name": "测试供应商3",
            "country_id": country_id,
            "contact": "联系人3",
            "email": "test3@example.com",
            "phone": "12345678903",
            "status": False
        }
    ]

    for supplier in supplier_data:
        client.post("/api/v1/suppliers/", json=supplier)

    # 测试获取供应商列表
    response = client.get("/api/v1/suppliers/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # 可能有之前测试创建的供应商

    # 测试分页
    response = client.get("/api/v1/suppliers/?skip=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_read_supplier(client: TestClient, db: Session):
    # 获取已存在的国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 创建一个测试供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = response.json()["id"]

    # 测试获取特定供应商
    response = client.get(f"/api/v1/suppliers/{supplier_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == supplier_data["name"]
    assert data["country_id"] == supplier_data["country_id"]
    assert data["contact"] == supplier_data["contact"]
    assert data["email"] == supplier_data["email"]
    assert data["phone"] == supplier_data["phone"]

    # 测试获取不存在的供应商
    response = client.get("/api/v1/suppliers/999")
    assert response.status_code == 404

def test_update_supplier(client: TestClient, db: Session):
    # 获取已存在的国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) >= 2, "数据库中至少需要两个国家数据，请先创建国家"
    country1_id = countries[0]["id"]  # 使用第一个国家
    country2_id = countries[1]["id"]  # 使用第二个国家

    # 创建一个测试供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country1_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = response.json()["id"]

    # 测试更新供应商
    update_data = {
        "name": "更新后的供应商",
        "country_id": country2_id,
        "contact": "更新后的联系人",
        "email": "updated@example.com",
        "phone": "98765432101",
        "status": False
    }
    response = client.put(f"/api/v1/suppliers/{supplier_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["country_id"] == update_data["country_id"]
    assert data["contact"] == update_data["contact"]
    assert data["email"] == update_data["email"]
    assert data["phone"] == update_data["phone"]
    assert data["status"] == update_data["status"]

    # 测试更新不存在的供应商
    response = client.put("/api/v1/suppliers/999", json=update_data)
    assert response.status_code == 404

def test_update_supplier_categories(client: TestClient, db: Session):
    # 获取已存在的国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 获取已存在的类别，而不是创建新类别
    category_response = client.get("/api/v1/categories/")
    assert category_response.status_code == 200
    categories = category_response.json()
    if len(categories) < 3:
        # 如果类别不足三个，创建所需的类别
        for i in range(3 - len(categories)):
            # 使用随机代码避免冲突
            import random
            random_code = f"CAT-{random.randint(1000, 9999)}"
            category_data = {
                "name": f"测试类别{random_code}",
                "code": random_code,
                "description": f"描述{random_code}",
                "status": True
            }
            response = client.post("/api/v1/categories/", json=category_data)
            assert response.status_code == 200

        # 重新获取类别列表
        category_response = client.get("/api/v1/categories/")
        assert category_response.status_code == 200
        categories = category_response.json()

    assert len(categories) >= 3, "数据库中至少需要三个类别数据"
    category_id1 = categories[0]["id"]  # 使用第一个类别
    category_id2 = categories[1]["id"]  # 使用第二个类别
    category_id3 = categories[2]["id"]  # 使用第三个类别

    # 创建一个测试供应商（带初始类别）
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True,
        "category_ids": [category_id1]
    }
    response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = response.json()["id"]

    # 测试更新供应商类别
    category_update = {
        "category_ids": [category_id2, category_id3]
    }
    response = client.put(f"/api/v1/suppliers/{supplier_id}/categories", json=category_update)
    assert response.status_code == 200
    data = response.json()

    # 验证类别已更新
    categories = data["categories"]
    category_ids = [c["id"] for c in categories]
    assert category_id2 in category_ids
    assert category_id3 in category_ids
    assert category_id1 not in category_ids

    # 测试更新不存在的供应商类别
    response = client.put("/api/v1/suppliers/999/categories", json=category_update)
    assert response.status_code == 404

def test_delete_supplier(client: TestClient, db: Session):
    # 获取已存在的国家
    country_response = client.get("/api/v1/countries/")
    assert country_response.status_code == 200
    countries = country_response.json()
    assert len(countries) > 0, "数据库中没有国家数据，请先创建国家"
    country_id = countries[0]["id"]  # 使用第一个国家

    # 创建一个测试供应商
    supplier_data = {
        "name": "测试供应商",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/suppliers/", json=supplier_data)
    supplier_id = response.json()["id"]

    # 测试删除供应商
    response = client.delete(f"/api/v1/suppliers/{supplier_id}")
    assert response.status_code == 200

    # 确认供应商已被删除
    response = client.get(f"/api/v1/suppliers/{supplier_id}")
    assert response.status_code == 404

    # 测试删除不存在的供应商
    response = client.delete("/api/v1/suppliers/999")
    assert response.status_code == 404
