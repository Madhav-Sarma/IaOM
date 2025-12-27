from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("person.person_id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'staff' or 'admin'
    store_id = Column(Integer, ForeignKey("store.store_id"), nullable=False)
    password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
