# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base  # noqa
from app.models.user import User  # noqa
from app.models.country import Country  # noqa
from app.models.port import Port  # noqa
from app.models.company import Company  # noqa
from app.models.ship import Ship  # noqa
from app.models.category import Category  # noqa
from app.models.product import Product  # noqa
from app.models.supplier import Supplier  # noqa
from app.models.order_upload import OrderUpload  # noqa
from app.models.order import Order, OrderItem  # noqa 