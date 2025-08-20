import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 测试分类API
def test_create_category(client: TestClient, db: Session):
    # 测试创建分类
    category_data = {
        "name": "测试分类",
        "code": "TST",
        "description": "这是一个测试分类",
        "status": True
    }
    response = client.post("/api/v1/categories/", json=category_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == category_data["name"]
    assert data["code"] == category_data["code"]
    assert data["description"] == category_data["description"]
    assert "id" in data
    
    # 测试创建重复代码的分类（应该失败）
    response = client.post("/api/v1/categories/", json=category_data)
    assert response.status_code == 400

def test_read_categories(client: TestClient, db: Session):
    # 先创建一些测试数据
    category_data = [
        {"name": "测试分类1", "code": "TS1", "description": "描述1", "status": True},
        {"name": "测试分类2", "code": "TS2", "description": "描述2", "status": True},
        {"name": "测试分类3", "code": "TS3", "description": "描述3", "status": False}
    ]
    
    for category in category_data:
        client.post("/api/v1/categories/", json=category)
    
    # 测试获取分类列表
    response = client.get("/api/v1/categories/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # 测试分页
    response = client.get("/api/v1/categories/?skip=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_read_category(client: TestClient, db: Session):
    # 先创建一个测试分类
    category_data = {
        "name": "测试分类", 
        "code": "TST", 
        "description": "这是一个测试分类",
        "status": True
    }
    response = client.post("/api/v1/categories/", json=category_data)
    category_id = response.json()["id"]
    
    # 测试获取特定分类
    response = client.get(f"/api/v1/categories/{category_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == category_data["name"]
    assert data["code"] == category_data["code"]
    assert data["description"] == category_data["description"]
    
    # 测试获取不存在的分类
    response = client.get("/api/v1/categories/999")
    assert response.status_code == 404

def test_update_category(client: TestClient, db: Session):
    # 先创建一个测试分类
    category_data = {
        "name": "测试分类", 
        "code": "TST", 
        "description": "这是一个测试分类",
        "status": True
    }
    response = client.post("/api/v1/categories/", json=category_data)
    category_id = response.json()["id"]
    
    # 测试更新分类
    update_data = {
        "name": "更新后的分类", 
        "code": "UPD", 
        "description": "这是更新后的描述",
        "status": False
    }
    response = client.put(f"/api/v1/categories/{category_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["code"] == update_data["code"]
    assert data["description"] == update_data["description"]
    assert data["status"] == update_data["status"]
    
    # 测试更新不存在的分类
    response = client.put("/api/v1/categories/999", json=update_data)
    assert response.status_code == 404

def test_delete_category(client: TestClient, db: Session):
    # 先创建一个测试分类
    category_data = {
        "name": "测试分类", 
        "code": "TST", 
        "description": "这是一个测试分类",
        "status": True
    }
    response = client.post("/api/v1/categories/", json=category_data)
    category_id = response.json()["id"]
    
    # 测试删除分类
    response = client.delete(f"/api/v1/categories/{category_id}")
    assert response.status_code == 200
    
    # 确认分类已被删除
    response = client.get(f"/api/v1/categories/{category_id}")
    assert response.status_code == 404
    
    # 测试删除不存在的分类
    response = client.delete("/api/v1/categories/999")
    assert response.status_code == 404
