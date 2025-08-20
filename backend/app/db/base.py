# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base  # noqa
from app.models.models import User  # noqa
from app.models.models import Country  # noqa
from app.models.models import Port  # noqa
from app.models.models import Company  # noqa
from app.models.models import Ship  # noqa
from app.models.models import Category  # noqa
from app.models.models import SupplierCategory  # noqa
from app.models.models import Product  # noqa
from app.models.models import Supplier  # noqa
from app.models.models import Order, OrderItem  # noqa
from app.models.models import FileUpload  # noqa
from app.models.models import CruiseOrder, CruiseOrderItem  # noqa
from app.models.models import EmailTemplate  # noqa
# from app.models.models import ImportSession, ImportTask, ImportLog, ImportTodo  # noqa - 这些类暂时不存在