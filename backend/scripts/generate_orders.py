from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
from app.db.session import SessionLocal
from app.models.models import Order, OrderItem, Ship, Company, Port, Product, Supplier

def generate_orders():
    db = SessionLocal()
    try:
        # 获取所有必要的数据
        ships = db.query(Ship).filter(Ship.status == True).all()
        if not ships:
            print("没有找到船舶")
            return

        companies = db.query(Company).filter(Company.status == True).all()
        if not companies:
            print("没有找到公司")
            return

        ports = db.query(Port).filter(Port.status == True).all()
        if not ports:
            print("没有找到港口")
            return

        products = db.query(Product).filter(Product.status == True).all()
        if not products:
            print("没有找到产品")
            return

        # 生成5个订单
        for i in range(5):
            # 随机选择船舶、公司和港口
            ship = random.choice(ships)
            company = ship.company  # 使用船舶关联的公司
            port = random.choice(ports)
            
            # 生成订单编号 (格式: ORD-年月日-序号)
            order_no = f"ORD-{datetime.now().strftime('%Y%m%d')}-{i+1:03d}"
            
            # 生成订单日期（今天）和交付日期（7-30天后）
            order_date = datetime.now()
            delivery_date = order_date + timedelta(days=random.randint(7, 30))
            
            # 创建订单
            order = Order(
                order_no=order_no,
                ship_id=ship.id,
                company_id=company.id,
                port_id=port.id,
                order_date=order_date,
                delivery_date=delivery_date,
                status="pending",
                notes=f"测试订单 {i+1}"
            )
            
            db.add(order)
            db.flush()  # 获取订单ID
            
            # 为每个订单生成3-5个订单项
            total_amount = 0
            num_items = random.randint(3, 5)
            
            # 随机选择不重复的产品
            selected_products = random.sample(products, num_items)
            
            for product in selected_products:
                # 获取产品的供应商
                supplier_id = product.supplier_id
                
                # 生成随机数量（1-100）
                quantity = random.randint(1, 100)
                
                # 使用产品价格
                price = float(product.price)
                
                # 计算总价
                item_total = quantity * price
                total_amount += item_total
                
                # 创建订单项
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    supplier_id=supplier_id,
                    quantity=quantity,
                    price=price,
                    total=item_total,
                    status="pending"
                )
                
                db.add(order_item)
            
            # 更新订单总金额
            order.total_amount = total_amount
            
            try:
                db.commit()
                print(f"创建订单成功: {order_no}, 总金额: ¥{total_amount:.2f}")
                print(f"包含 {num_items} 个订单项")
            except Exception as e:
                db.rollback()
                print(f"创建订单失败: {order_no}, 错误: {str(e)}")
                continue
        
        print("\n所有订单生成完成！")
        
    except Exception as e:
        print(f"发生错误: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_orders() 