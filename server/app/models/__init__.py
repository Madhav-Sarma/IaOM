# Import all models so Alembic autogenerate can detect tables
from app.models.store import Store
from app.models.person import Person
from app.models.product import Product
from app.models.user import User
from app.models.inventory import Inventory
from app.models.order import Order
