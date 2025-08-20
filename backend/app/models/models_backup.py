from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Numeric, Text, UniqueConstraint, CheckConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.db.base_class import Base

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
    notifications = relationship("NotificationHistory", back_populates="category")

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
    pack_size = Column(Integer, nullable=True)
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
    inventory_items = relationship("Inventory", back_populates="product")
    supplier_prices = relationship("SupplierProductPricing", back_populates="product")
    history = relationship("ProductHistory", back_populates="product", order_by="desc(ProductHistory.history_date)")

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
    inventory_items = relationship("Inventory", back_populates="supplier")
    categories = relationship("Category", secondary="supplier_categories", back_populates="suppliers")
    product_prices = relationship("SupplierProductPricing", back_populates="supplier")
    notifications = relationship("NotificationHistory", back_populates="supplier")

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
    deliveries = relationship("Delivery", back_populates="order")

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

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    delivery_no = Column(String(50), unique=True, nullable=False)
    delivery_date = Column(DateTime)
    status = Column(String(20), default="pending")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="deliveries")

class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    quantity = Column(Numeric(10, 2))
    unit_price = Column(Numeric(10, 2))
    status = Column(String(20), default="available")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="inventory_items")
    supplier = relationship("Supplier", back_populates="inventory_items")

class SupplierProductPricing(Base):
    __tablename__ = "supplier_product_pricing"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    price = Column(Numeric(10, 2), nullable=False)
    effective_from = Column(DateTime, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            'supplier_id', 'product_id', 'effective_from',
            name='uix_supplier_product_pricing'
        ),
    )

    supplier = relationship("Supplier", back_populates="product_prices")
    product = relationship("Product", back_populates="supplier_prices")

class OrderUpload(Base):
    __tablename__ = "order_uploads"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"))
    ship_id = Column(Integer, ForeignKey("ships.id"))
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    country = relationship("Country")
    ship = relationship("Ship")
    orders = relationship("UploadOrder", back_populates="upload")
    order_analyses = relationship("OrderAnalysis", back_populates="order_upload")

class UploadOrder(Base):
    __tablename__ = "upload_orders"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("order_uploads.id"))
    order_no = Column(String(50), nullable=False)
    order_date = Column(DateTime)
    currency = Column(String(3))
    ship_code = Column(String(50))
    delivery_date = Column(DateTime)
    supplier_info = Column(Text)
    notes = Column(Text)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    upload = relationship("OrderUpload", back_populates="orders")
    items = relationship("UploadOrderItem", back_populates="order")

class UploadOrderItem(Base):
    __tablename__ = "upload_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("upload_orders.id"))
    product_code = Column(String(50))
    quantity = Column(Numeric(10, 2))
    unit = Column(String(20))
    unit_price = Column(Numeric(10, 2))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("UploadOrder", back_populates="items")

class OrderAnalysis(Base):
    __tablename__ = "order_analyses"

    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("order_uploads.id"))
    order_no = Column(String(50), nullable=False)
    order_date = Column(DateTime)
    currency = Column(String(3))
    ship_code = Column(String(50))
    order_status = Column(String(20))
    delivery_date = Column(DateTime)
    supplier_info = Column(Text)
    notes = Column(Text)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order_upload = relationship("OrderUpload", back_populates="order_analyses")
    analysis_items = relationship("OrderAnalysisItem", back_populates="order_analysis")

class OrderAnalysisItem(Base):
    __tablename__ = "order_analysis_items"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("order_analyses.id"))
    product_code = Column(String(50))
    quantity = Column(Numeric(10, 2))
    unit = Column(String(20))
    unit_price = Column(Numeric(10, 2))
    description = Column(Text)
    matched_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order_analysis = relationship("OrderAnalysis", back_populates="analysis_items")
    matched_product = relationship("Product", foreign_keys=[matched_product_id])
    category = relationship("Category", foreign_keys=[category_id])
    assignments = relationship("OrderAssignment", back_populates="analysis_item")

class OrderAssignment(Base):
    __tablename__ = "order_assignments"

    id = Column(Integer, primary_key=True, index=True)
    analysis_item_id = Column(Integer, ForeignKey("order_analysis_items.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    quantity = Column(Numeric(10, 2))
    unit_price = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    status = Column(String(20), default="pending")
    notification_sent = Column(DateTime)
    notification_status = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    analysis_item = relationship("OrderAnalysisItem", back_populates="assignments")
    supplier = relationship("Supplier")

class NotificationHistory(Base):
    __tablename__ = "notification_history"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    subject = Column(String(255))
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    supplier = relationship("Supplier", back_populates="notifications")
    category = relationship("Category", back_populates="notifications")

class ProductHistory(Base):
    __tablename__ = "product_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name_en = Column(String(100), nullable=True)
    code = Column(String(50), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    country_id = Column(Integer, ForeignKey("countries.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    unit = Column(String(20))
    price = Column(Numeric(10, 2))
    product_name_jp = Column(String(100), nullable=True)
    unit_size = Column(String(50), nullable=True)
    pack_size = Column(Integer, nullable=True)
    country_of_origin = Column(String(50), nullable=True)
    brand = Column(String(100), nullable=True)
    currency = Column(String(20), nullable=True)
    effective_from = Column(DateTime, nullable=True)
    effective_to = Column(DateTime, nullable=True)
    status = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    history_date = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="history")
    category = relationship("Category")
    country = relationship("Country")
    supplier = relationship("Supplier")

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

class OrderProcessingItem(Base):
    __tablename__ = "order_processing_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=True)
    order_no = Column(String(50))
    ship_name = Column(String(100))
    product_id = Column(Integer)
    product_name = Column(String(100))
    product_code = Column(String(50))
    supplier_name = Column(String(100))
    quantity = Column(Numeric(10, 2))
    price = Column(Numeric(10, 2))
    total = Column(Numeric(10, 2))
    status = Column(String(20), default="pending")  # pending, processed
    added_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # 关系
    user = relationship("User", backref="processing_items")
    order_item = relationship("OrderItem", backref="processing_entries")