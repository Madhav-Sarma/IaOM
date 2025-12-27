from sqlalchemy import Column, Integer, String, Numeric
from app.core.database import Base

class Product(Base):
    __tablename__ = "product"
    
    prod_id = Column(Integer, primary_key=True, index=True)
    SKU = Column(String(100), unique=True, nullable=False)
    prod_name = Column(String(255), nullable=False)
    prod_category = Column(String(100), nullable=False)
    prod_descreption = Column(String(1000))
    unit_price = Column(Numeric(10, 2), nullable=False)
