import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 测试港口API
def test_create_port(client: TestClient, db: Session):
    # 先创建一个国家，因为港口需要关联到国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 测试创建港口
    port_data = {
        "name": "测试港口",
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    response = client.post("/api/v1/ports/", json=port_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == port_data["name"]
    assert data["code"] == port_data["code"]
    assert data["country_id"] == port_data["country_id"]
    assert data["location"] == port_data["location"]
    assert "id" in data

def test_read_ports(client: TestClient, db: Session):
    # 先创建一个国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 创建一些测试港口
    port_data = [
        {
            "name": "测试港口1", 
            "code": "TST-PORT1",
            "country_id": country_id,
            "location": "位置1",
            "status": True
        },
        {
            "name": "测试港口2", 
            "code": "TST-PORT2",
            "country_id": country_id,
            "location": "位置2",
            "status": True
        },
        {
            "name": "测试港口3", 
            "code": "TST-PORT3",
            "country_id": country_id,
            "location": "位置3",
            "status": False
        }
    ]
    
    for port in port_data:
        client.post("/api/v1/ports/", json=port)
    
    # 测试获取港口列表
    response = client.get("/api/v1/ports/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # 测试分页
    response = client.get("/api/v1/ports/?skip=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    
    # 测试按国家筛选
    response = client.get(f"/api/v1/ports/?country_id={country_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

def test_read_port(client: TestClient, db: Session):
    # 先创建一个国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 创建一个测试港口
    port_data = {
        "name": "测试港口", 
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    response = client.post("/api/v1/ports/", json=port_data)
    port_id = response.json()["id"]
    
    # 测试获取特定港口
    response = client.get(f"/api/v1/ports/{port_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == port_data["name"]
    assert data["code"] == port_data["code"]
    assert data["country_id"] == port_data["country_id"]
    assert data["location"] == port_data["location"]
    
    # 测试获取不存在的港口
    response = client.get("/api/v1/ports/999")
    assert response.status_code == 404

def test_update_port(client: TestClient, db: Session):
    # 先创建两个国家
    country1_data = {"name": "测试国家1", "code": "TS1", "status": True}
    country1_response = client.post("/api/v1/countries/", json=country1_data)
    country1_id = country1_response.json()["id"]
    
    country2_data = {"name": "测试国家2", "code": "TS2", "status": True}
    country2_response = client.post("/api/v1/countries/", json=country2_data)
    country2_id = country2_response.json()["id"]
    
    # 创建一个测试港口
    port_data = {
        "name": "测试港口", 
        "code": "TST-PORT",
        "country_id": country1_id,
        "location": "测试位置",
        "status": True
    }
    response = client.post("/api/v1/ports/", json=port_data)
    port_id = response.json()["id"]
    
    # 测试更新港口
    update_data = {
        "name": "更新后的港口", 
        "code": "UPD-PORT",
        "country_id": country2_id,
        "location": "更新后的位置",
        "status": False
    }
    response = client.put(f"/api/v1/ports/{port_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["code"] == update_data["code"]
    assert data["country_id"] == update_data["country_id"]
    assert data["location"] == update_data["location"]
    assert data["status"] == update_data["status"]
    
    # 测试更新不存在的港口
    response = client.put("/api/v1/ports/999", json=update_data)
    assert response.status_code == 404

def test_delete_port(client: TestClient, db: Session):
    # 先创建一个国家
    country_data = {"name": "测试国家", "code": "TST", "status": True}
    country_response = client.post("/api/v1/countries/", json=country_data)
    country_id = country_response.json()["id"]
    
    # 创建一个测试港口
    port_data = {
        "name": "测试港口", 
        "code": "TST-PORT",
        "country_id": country_id,
        "location": "测试位置",
        "status": True
    }
    response = client.post("/api/v1/ports/", json=port_data)
    port_id = response.json()["id"]
    
    # 测试删除港口
    response = client.delete(f"/api/v1/ports/{port_id}")
    assert response.status_code == 200
    
    # 确认港口已被删除
    response = client.get(f"/api/v1/ports/{port_id}")
    assert response.status_code == 404
    
    # 测试删除不存在的港口
    response = client.delete("/api/v1/ports/999")
    assert response.status_code == 404
