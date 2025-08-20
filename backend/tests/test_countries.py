import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 测试国家API
def test_create_country(client: TestClient, db: Session):
    # 测试创建国家
    country_data = {
        "name": "测试国家",
        "code": "TST",
        "status": True
    }
    response = client.post("/api/v1/countries/", json=country_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == country_data["name"]
    assert data["code"] == country_data["code"]
    assert "id" in data
    
    # 测试创建重复代码的国家（应该失败）
    response = client.post("/api/v1/countries/", json=country_data)
    assert response.status_code == 400

def test_read_countries(client: TestClient, db: Session):
    # 先创建一些测试数据
    country_data = [
        {"name": "测试国家1", "code": "TS1", "status": True},
        {"name": "测试国家2", "code": "TS2", "status": True},
        {"name": "测试国家3", "code": "TS3", "status": False}
    ]
    
    for country in country_data:
        client.post("/api/v1/countries/", json=country)
    
    # 测试获取国家列表
    response = client.get("/api/v1/countries/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # 测试分页
    response = client.get("/api/v1/countries/?skip=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_read_country(client: TestClient, db: Session):
    # 先创建一个测试国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    response = client.post("/api/v1/countries/", json=country_data)
    country_id = response.json()["id"]
    
    # 测试获取特定国家
    response = client.get(f"/api/v1/countries/{country_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == country_data["name"]
    assert data["code"] == country_data["code"]
    
    # 测试获取不存在的国家
    response = client.get("/api/v1/countries/999")
    assert response.status_code == 404

def test_update_country(client: TestClient, db: Session):
    # 先创建一个测试国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    response = client.post("/api/v1/countries/", json=country_data)
    country_id = response.json()["id"]
    
    # 测试更新国家
    update_data = {"name": "更新后的国家", "code": "UPD", "status": False}
    response = client.put(f"/api/v1/countries/{country_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["code"] == update_data["code"]
    assert data["status"] == update_data["status"]
    
    # 测试更新不存在的国家
    response = client.put("/api/v1/countries/999", json=update_data)
    assert response.status_code == 404

def test_delete_country(client: TestClient, db: Session):
    # 先创建一个测试国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    response = client.post("/api/v1/countries/", json=country_data)
    country_id = response.json()["id"]
    
    # 测试删除国家
    response = client.delete(f"/api/v1/countries/{country_id}")
    assert response.status_code == 200
    
    # 确认国家已被删除
    response = client.get(f"/api/v1/countries/{country_id}")
    assert response.status_code == 404
    
    # 测试删除不存在的国家
    response = client.delete("/api/v1/countries/999")
    assert response.status_code == 404
