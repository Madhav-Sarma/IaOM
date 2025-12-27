from sqlalchemy import Column, Integer, ForeignKey
from app.core.database import Base

class Inventory(Base):
    __tablename__ = "inventory"
    
    inventory_id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("store.store_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("product.prod_id"), nullable=False)
    units = Column(Integer, nullable=False, default=0)
