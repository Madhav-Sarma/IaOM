from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class Store(Base):
    __tablename__ = "store"
    
    store_id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(255), nullable=False)
    store_address = Column(String(500), nullable=False)
    low_stock_threshold = Column(Integer, nullable=False, default=10)
    restore_stock_on_cancel = Column(Boolean, nullable=False, default=True)
    sales_lookback_days = Column(Integer, nullable=False, default=30)
    reorder_horizon_days = Column(Integer, nullable=False, default=7)
    currency = Column(String(8), nullable=False, default="₹")
