from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from app.crud.base import CRUDBase
from app.models.models import OrderUpload, UploadOrder, UploadOrderItem, Order, OrderItem, Product, Supplier
from app.schemas.order_upload import OrderUpload as OrderUploadSchema, OrderUploadCreate, OrderUploadUpdate
from app.utils.excel_parser import OrderParser
from datetime import datetime
import re

class CRUDOrderUpload(CRUDBase[OrderUpload, OrderUploadCreate, OrderUploadUpdate]):
    def create_from_upload(
        self,
        db: Session,
        *,
        file_path: str,
        file_name: str,
        country_id: int,
        ship_id: int
    ) -> OrderUpload:
        try:
            # 解析订单文件
            parser = OrderParser(file_path)
            orders_data = parser.parse()

            # 创建上传记录
            upload_record = OrderUpload(
                file_name=file_name,
                country_id=country_id,
                ship_id=ship_id,
                status="completed"
            )
            db.add(upload_record)
            db.flush()

            # 创建订单记录
            for order_data in orders_data:
                order = UploadOrder(
                    upload_id=upload_record.id,
                    order_no=order_data["header"]["order_no"],
                    order_date=datetime.strptime(order_data["header"]["order_date"], "%Y-%m-%d") if isinstance(order_data["header"]["order_date"], str) else order_data["header"]["order_date"],
                    currency=order_data["header"]["currency"],
                    ship_code=order_data["header"]["ship_code"],
                    delivery_date=datetime.strptime(order_data["header"]["delivery_date"], "%Y-%m-%d") if isinstance(order_data["header"]["delivery_date"], str) else order_data["header"]["delivery_date"],
                    supplier_info=order_data["header"]["supplier_info"],
                    notes=order_data["header"].get("notes"),
                    status="pending"
                )
                db.add(order)
                db.flush()

                # 创建订单项
                for item_data in order_data["items"]:
                    order_item = UploadOrderItem(
                        order_id=order.id,
                        product_code=item_data["product_code"],
                        quantity=item_data["quantity"],
                        unit=item_data["unit"],
                        unit_price=item_data["unit_price"],
                        description=item_data["description"]
                    )
                    db.add(order_item)

            db.commit()
            db.refresh(upload_record)
            return upload_record

        except Exception as e:
            db.rollback()
            # 创建失败的上传记录
            failed_record = OrderUpload(
                file_name=file_name,
                country_id=country_id,
                ship_id=ship_id,
                status="failed",
                error_message=str(e)
            )
            db.add(failed_record)
            db.commit()
            return failed_record

    def get_with_details(
        self,
        db: Session,
        *,
        id: int
    ) -> Optional[OrderUpload]:
        """获取上传记录及其关联的订单信息"""
        return db.query(OrderUpload).filter(
            OrderUpload.id == id
        ).options(
            joinedload(OrderUpload.orders).joinedload(UploadOrder.items),
            joinedload(OrderUpload.country),
            joinedload(OrderUpload.ship)
        ).first()

    def get_or_create_product(
        self,
        db: Session,
        *,
        product_code: str,
        description: str
    ) -> tuple[Product, bool]:
        """获取或创建产品，返回 (product, created) 元组"""
        # 先尝试查找产品
        product = db.query(Product).filter(Product.code == product_code).first()
        if product:
            return product, False
            
        # 如果产品不存在，创建新产品
        # 为新产品创建一个默认供应商
        supplier = db.query(Supplier).first()  # 获取第一个供应商作为默认值
        if not supplier:
            # 如果没有供应商，创建一个默认供应商
            supplier = Supplier(
                name="默认供应商",
                country_id=1,  # 使用默认国家ID
                status=True
            )
            db.add(supplier)
            db.flush()
        
        # 创建新产品
        product = Product(
            name=description or f"产品 {product_code}",
            code=product_code,
            category_id=1,  # 使用默认类别ID
            country_id=1,   # 使用默认国家ID
            supplier_id=supplier.id,
            unit="个",      # 默认单位
            price=0,        # 默认价格
            status=True
        )
        db.add(product)
        db.flush()
        return product, True

    def confirm_order(
        self,
        db: Session,
        *,
        order_id: int
    ) -> Optional[Order]:
        """确认上传的订单，创建正式订单记录"""
        try:
            # 获取上传的订单
            upload_order = db.query(UploadOrder).filter(UploadOrder.id == order_id).first()
            print(f"查找上传订单: {order_id}, 结果: {upload_order}")
            if not upload_order:
                return None

            # 获取上传记录以获取ship_id
            upload_record = db.query(OrderUpload).filter(OrderUpload.id == upload_order.upload_id).first()
            print(f"查找上传记录: {upload_order.upload_id}, 结果: {upload_record}")
            if not upload_record:
                return None

            try:
                # 生成新的唯一订单号
                current_time = datetime.utcnow()
                new_order_no = f"ORD-{current_time.strftime('%Y%m%d%H%M%S')}-{order_id}"
                print(f"生成新订单号: {new_order_no}")

                # 创建正式订单
                order = Order(
                    order_no=new_order_no,
                    ship_id=upload_record.ship_id,
                    company_id=1,  # 暂时固定为1，后续可以根据需求修改
                    port_id=1,     # 暂时固定为1，后续可以根据需求修改
                    order_date=upload_order.order_date,
                    delivery_date=upload_order.delivery_date,
                    status="pending",
                    total_amount=0,
                    notes=upload_order.notes
                )
                db.add(order)
                db.flush()
                print(f"创建订单成功: {order.id}")

                # 获取上传的订单项
                upload_items = db.query(UploadOrderItem).filter(
                    UploadOrderItem.order_id == upload_order.id
                ).all()
                print(f"获取订单项: {len(upload_items)} 个")

                # 创建正式订单项
                total_amount = 0
                for upload_item in upload_items:
                    print(f"处理订单项: quantity={upload_item.quantity}, unit_price={upload_item.unit_price}")
                    
                    # 获取或创建产品
                    product, created = self.get_or_create_product(
                        db,
                        product_code=upload_item.product_code,
                        description=upload_item.description
                    )
                    print(f"{'创建' if created else '找到'}产品: {product.code} ({product.name})")

                    item_total = upload_item.quantity * upload_item.unit_price
                    order_item = OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        supplier_id=product.supplier_id,
                        quantity=upload_item.quantity,
                        price=upload_item.unit_price,
                        total=item_total,
                        status="unprocessed"
                    )
                    db.add(order_item)
                    total_amount += item_total
                    print(f"订单项总额: {item_total}, 累计总额: {total_amount}")

                # 更新订单总金额
                order.total_amount = total_amount
                print(f"订单最终总额: {total_amount}")

                # 更新上传订单状态
                upload_order.status = "confirmed"

                db.commit()
                db.refresh(order)
                return order

            except Exception as e:
                print(f"处理订单时出错: {str(e)}")
                db.rollback()
                raise e

        except Exception as e:
            print(f"确认订单时出错: {str(e)}")
            raise e

order_upload = CRUDOrderUpload(OrderUpload) 