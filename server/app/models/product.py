from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from app.core.database import Base

class Product(Base):
    __tablename__ = "product"
    
    prod_id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("store.store_id"), nullable=False)  # Products belong to a store
    SKU = Column(String(100), nullable=False)  # SKU unique within store
    prod_name = Column(String(255), nullable=False)
    prod_category = Column(String(100), nullable=False)
    prod_description = Column(String(1000))
    unit_price = Column(Numeric(10, 2), nullable=False)
    inventory = Column(Integer, default=0, nullable=False)  # Stock quantity
