from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
from app.db.session import SessionLocal
from app.models.models import Supplier, Product, Category, Country

def generate_products():
    db = SessionLocal()
    try:
        # 获取所有供应商
        suppliers = db.query(Supplier).filter(Supplier.status == True).all()
        # 获取所有类别
        categories = db.query(Category).filter(Category.status == True).all()
        # 获取所有国家
        countries = db.query(Country).filter(Country.status == True).all()
        
        if not suppliers:
            print("没有找到供应商")
            return
        if not categories:
            print("没有找到类别")
            return
        if not countries:
            print("没有找到国家")
            return
        
        # 产品名称前缀列表
        name_prefixes = ["高级", "标准", "特制", "定制", "优质", "精选", "专业", "豪华"]
        # 产品名称后缀列表
        name_suffixes = ["零件", "组件", "配件", "装置", "设备", "工具", "材料", "用品"]
        # 产品单位列表
        units = ["个", "套", "件", "组", "箱", "包", "盒"]
        
        for supplier in suppliers:
            print(f"\n为供应商 {supplier.name} 生成产品...")
            
            # 为每个供应商生成20个产品
            for i in range(20):
                # 随机选择类别和国家
                category = random.choice(categories)
                country = random.choice(countries)
                
                # 生成产品名称
                prefix = random.choice(name_prefixes)
                suffix = random.choice(name_suffixes)
                name = f"{prefix}{category.name}{suffix}-{i+1}号"
                
                # 生成产品代码
                code = f"{supplier.id:03d}-{category.id:03d}-{i+1:03d}"
                
                # 生成随机价格（100到10000之间）
                price = round(random.uniform(100, 10000), 2)
                
                # 生成生效时间（从现在开始）
                effective_from = datetime.utcnow()
                # 生效时间随机1-12个月
                effective_to = effective_from + timedelta(days=random.randint(30, 365))
                
                # 创建产品
                product = Product(
                    name=name,
                    code=code,
                    category_id=category.id,
                    country_id=country.id,
                    supplier_id=supplier.id,
                    unit=random.choice(units),
                    price=price,
                    effective_from=effective_from,
                    effective_to=effective_to,
                    status=True
                )
                
                try:
                    db.add(product)
                    db.commit()
                    print(f"创建产品成功: {name}")
                except Exception as e:
                    db.rollback()
                    print(f"创建产品失败: {name}, 错误: {str(e)}")
                    continue
        
        print("\n所有产品生成完成！")
        
    except Exception as e:
        print(f"发生错误: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_products() 