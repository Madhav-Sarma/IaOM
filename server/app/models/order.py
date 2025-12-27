from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(Integer, primary_key=True, index=True)
    status = Column(String(20), nullable=False)  # 'pending', 'confirmed', 'shipped', 'cancelled'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    inventory_id = Column(Integer, ForeignKey("inventory.inventory_id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    person_id = Column(Integer, ForeignKey("person.person_id"), nullable=False)
    order_quantity = Column(Integer, nullable=False)
