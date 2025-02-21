from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import Supplier, Category
import random

def update_supplier_categories():
    db = SessionLocal()
    try:
        # 获取所有供应商和类别
        suppliers = db.query(Supplier).filter(Supplier.status == True).all()
        categories = db.query(Category).filter(Category.status == True).all()
        
        if not suppliers:
            print("没有找到供应商")
            return
        if not categories:
            print("没有找到类别")
            return
        
        print(f"\n开始更新供应商类别关联...")
        print(f"找到 {len(suppliers)} 个供应商")
        print(f"找到 {len(categories)} 个类别")
        
        # 为每个供应商分配2-4个随机类别
        for supplier in suppliers:
            # 随机选择2-4个类别
            num_categories = random.randint(2, 4)
            selected_categories = random.sample(categories, min(num_categories, len(categories)))
            
            # 更新供应商的类别
            supplier.categories = selected_categories
            
            try:
                db.add(supplier)
                db.commit()
                print(f"供应商 '{supplier.name}' 已分配 {len(selected_categories)} 个类别:")
                for category in selected_categories:
                    print(f"  - {category.name}")
            except Exception as e:
                db.rollback()
                print(f"更新供应商 '{supplier.name}' 失败: {str(e)}")
                continue
        
        print("\n供应商类别关联更新完成！")
        
    except Exception as e:
        print(f"发生错误: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    update_supplier_categories() 