from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Store(Base):
    __tablename__ = "store"
    
    store_id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(255), nullable=False)
    store_address = Column(String(500), nullable=False)
