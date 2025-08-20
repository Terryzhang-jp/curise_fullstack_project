from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Numeric, Text, UniqueConstraint, CheckConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.db.base_class import Base

# 导入邮件配置模型
from .email_config import EmailConfig

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="user")  # superadmin, admin, user
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    file_uploads = relationship("FileUpload", back_populates="upload_user")

class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(3), nullable=False)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ports = relationship("Port", back_populates="country")
    companies = relationship("Company", back_populates="country")
    suppliers = relationship("Supplier", back_populates="country")
    products = relationship("Product", back_populates="country")

class Port(Base):
    __tablename__ = "ports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True)
    country_id = Column(Integer, ForeignKey("countries.id"))
    location = Column(String(200))
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    country = relationship("Country", back_populates="ports")
    orders = relationship("Order", back_populates="port")
    products = relationship("Product", back_populates="port")

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"))
    contact = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    country = relationship("Country", back_populates="companies")
    ships = relationship("Ship", back_populates="company")
    orders = relationship("Order", back_populates="company")

class Ship(Base):
    __tablename__ = "ships"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    company_id = Column(Integer, ForeignKey("companies.id"))
    ship_type = Column(String(50))
    capacity = Column(Integer, nullable=False, default=0)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="ships")
    orders = relationship("Order", back_populates="ship")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True)
    description = Column(Text)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    products = relationship("Product", back_populates="category")
    suppliers = relationship("Supplier", secondary="supplier_categories", back_populates="categories")

class SupplierCategory(Base):
    __tablename__ = "supplier_categories"

    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete='CASCADE'), primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete='CASCADE'), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('supplier_id', 'category_id', name='uq_supplier_category'),
    )

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_name_en = Column(String(100), nullable=False)
    product_name_jp = Column(String(100), nullable=True)
    code = Column(String(50), nullable=True)
    country_id = Column(Integer, ForeignKey("countries.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"))
    port_id = Column(Integer, ForeignKey("ports.id", ondelete="SET NULL"), nullable=True)
    unit = Column(String(20))
    price = Column(Numeric(10, 2))
    unit_size = Column(String(50), nullable=True)
    pack_size = Column(String(50), nullable=True)  # 改为字符串类型，支持 "30个", "1箱" 等格式
    country_of_origin = Column(String(50), nullable=True)
    brand = Column(String(100), nullable=True)
    currency = Column(String(20), nullable=True)
    effective_from = Column(DateTime, nullable=True)
    effective_to = Column(DateTime, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('country_id', 'product_name_en', 'port_id', name='uix_country_product_name_port'),
        CheckConstraint('price >= 0', name='check_product_price_positive'),
    )

    category = relationship("Category", back_populates="products")
    country = relationship("Country", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    port = relationship("Port", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"))
    contact = Column(String(100))
    email = Column(String(100))
    phone = Column(String(20))
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    country = relationship("Country", back_populates="suppliers")
    products = relationship("Product", back_populates="supplier")
    order_items = relationship("OrderItem", back_populates="supplier")
    categories = relationship("Category", secondary="supplier_categories", back_populates="suppliers")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, nullable=False)
    ship_id = Column(Integer, ForeignKey("ships.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    port_id = Column(Integer, ForeignKey("ports.id"))
    order_date = Column(DateTime, nullable=False)
    delivery_date = Column(DateTime)
    status = Column(String(20), default="not_started")  # not_started, partially_processed, fully_processed
    total_amount = Column(Numeric(10, 2), default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ship = relationship("Ship", back_populates="orders")
    company = relationship("Company", back_populates="orders")
    port = relationship("Port", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    quantity = Column(Numeric(10, 2))
    price = Column(Numeric(10, 2))
    total = Column(Numeric(10, 2))
    status = Column(String(20), default="unprocessed")  # unprocessed, processed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")
    supplier = relationship("Supplier", back_populates="order_items")

# 文件上传记录表
class FileUpload(Base):
    __tablename__ = "file_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=True)
    ship_id = Column(Integer, ForeignKey("ships.id"), nullable=True)
    upload_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="uploaded")  # uploaded, processing, processed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # 关系
    country = relationship("Country")
    ship = relationship("Ship")
    upload_user = relationship("User", back_populates="file_uploads")
    cruise_orders = relationship("CruiseOrder", back_populates="file_upload")

# 邮轮订单表
class CruiseOrder(Base):
    __tablename__ = "cruise_orders"

    id = Column(Integer, primary_key=True, index=True)
    file_upload_id = Column(Integer, ForeignKey("file_uploads.id"), nullable=False)
    order_number = Column(String(100), nullable=False)  # PO号
    order_date = Column(DateTime, nullable=True)
    currency = Column(String(10), nullable=True)
    ship_code = Column(String(50), nullable=True)
    ship_name = Column(String(100), nullable=True)
    loading_date = Column(DateTime, nullable=True)
    supplier_name = Column(String(200), nullable=True)
    supplier_code = Column(String(100), nullable=True)
    total_amount = Column(Numeric(15, 2), nullable=True)
    order_type = Column(String(10), nullable=True)  # OP, OF等
    destination = Column(String(200), nullable=True)
    port_code = Column(String(10), nullable=True)
    raw_header_data = Column(JSON, nullable=True)  # 存储原始HEADER数据
    status = Column(String(20), default="pending")  # pending, confirmed, processed
    is_selected = Column(Boolean, default=False)  # 用户是否选择了这个订单
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    # 关系
    file_upload = relationship("FileUpload", back_populates="cruise_orders")
    order_items = relationship("CruiseOrderItem", back_populates="cruise_order")

# 邮轮订单项目表
class CruiseOrderItem(Base):
    __tablename__ = "cruise_order_items"

    id = Column(Integer, primary_key=True, index=True)
    cruise_order_id = Column(Integer, ForeignKey("cruise_orders.id"), nullable=False)
    line_number = Column(Integer, nullable=True)  # 行号
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # 匹配到的产品ID
    product_code = Column(String(100), nullable=True)  # 原始产品代码
    product_name = Column(String(500), nullable=False)  # 原始产品名称
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(20), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=True)
    total_price = Column(Numeric(15, 2), nullable=True)
    raw_detail_data = Column(JSON, nullable=True)  # 存储原始DETAIL数据
    match_status = Column(String(20), default="unmatched")  # unmatched, matched, manual
    match_confidence = Column(Numeric(3, 2), nullable=True)  # 匹配置信度 0-1
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    cruise_order = relationship("CruiseOrder", back_populates="order_items")
    matched_product = relationship("Product")

# 邮件模板表
class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    subject = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

