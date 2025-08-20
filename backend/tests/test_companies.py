import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 测试公司API
def test_create_company(client: TestClient, db: Session):
    # 先创建一个国家，因为公司需要关联到国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 测试创建公司
    company_data = {
        "name": "测试公司",
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/companies/", json=company_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == company_data["name"]
    assert data["country_id"] == company_data["country_id"]
    assert data["contact"] == company_data["contact"]
    assert data["email"] == company_data["email"]
    assert data["phone"] == company_data["phone"]
    assert "id" in data
    
    # 测试创建重复名称的公司（应该失败）
    response = client.post("/api/v1/companies/", json=company_data)
    assert response.status_code == 400

def test_read_companies(client: TestClient, db: Session):
    # 先创建一个国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 创建一些测试公司
    company_data = [
        {
            "name": "测试公司1", 
            "country_id": country_id,
            "contact": "联系人1",
            "email": "test1@example.com",
            "phone": "12345678901",
            "status": True
        },
        {
            "name": "测试公司2", 
            "country_id": country_id,
            "contact": "联系人2",
            "email": "test2@example.com",
            "phone": "12345678902",
            "status": True
        },
        {
            "name": "测试公司3", 
            "country_id": country_id,
            "contact": "联系人3",
            "email": "test3@example.com",
            "phone": "12345678903",
            "status": False
        }
    ]
    
    for company in company_data:
        client.post("/api/v1/companies/", json=company)
    
    # 测试获取公司列表
    response = client.get("/api/v1/companies/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # 测试分页
    response = client.get("/api/v1/companies/?skip=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1

def test_read_company(client: TestClient, db: Session):
    # 先创建一个国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 创建一个测试公司
    company_data = {
        "name": "测试公司", 
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/companies/", json=company_data)
    company_id = response.json()["id"]
    
    # 测试获取特定公司
    response = client.get(f"/api/v1/companies/{company_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == company_data["name"]
    assert data["country_id"] == company_data["country_id"]
    assert data["contact"] == company_data["contact"]
    assert data["email"] == company_data["email"]
    assert data["phone"] == company_data["phone"]
    
    # 测试获取不存在的公司
    response = client.get("/api/v1/companies/999")
    assert response.status_code == 404

def test_update_company(client: TestClient, db: Session):
    # 先创建两个国家
    country1_data = {"name": "测试国家1", "code": "TS1", "status": True}
    country1_response = client.post("/api/v1/countries/", json=country1_data)
    country1_id = country1_response.json()["id"]
    
    country2_data = {"name": "测试国家2", "code": "TS2", "status": True}
    country2_response = client.post("/api/v1/countries/", json=country2_data)
    country2_id = country2_response.json()["id"]
    
    # 创建一个测试公司
    company_data = {
        "name": "测试公司", 
        "country_id": country1_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/companies/", json=company_data)
    company_id = response.json()["id"]
    
    # 测试更新公司
    update_data = {
        "name": "更新后的公司", 
        "country_id": country2_id,
        "contact": "更新后的联系人",
        "email": "updated@example.com",
        "phone": "98765432101",
        "status": False
    }
    response = client.put(f"/api/v1/companies/{company_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["country_id"] == update_data["country_id"]
    assert data["contact"] == update_data["contact"]
    assert data["email"] == update_data["email"]
    assert data["phone"] == update_data["phone"]
    assert data["status"] == update_data["status"]
    
    # 测试更新不存在的公司
    response = client.put("/api/v1/companies/999", json=update_data)
    assert response.status_code == 404

def test_delete_company(client: TestClient, db: Session):
    # 先创建一个国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 创建一个测试公司
    company_data = {
        "name": "测试公司", 
        "country_id": country_id,
        "contact": "测试联系人",
        "email": "test@example.com",
        "phone": "12345678901",
        "status": True
    }
    response = client.post("/api/v1/companies/", json=company_data)
    company_id = response.json()["id"]
    
    # 测试删除公司
    response = client.delete(f"/api/v1/companies/{company_id}")
    assert response.status_code == 200
    
    # 确认公司已被删除
    response = client.get(f"/api/v1/companies/{company_id}")
    assert response.status_code == 404
    
    # 测试删除不存在的公司
    response = client.delete("/api/v1/companies/999")
    assert response.status_code == 404
