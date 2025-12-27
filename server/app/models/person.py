from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Person(Base):
    __tablename__ = "person"
    
    person_id = Column(Integer, primary_key=True, index=True)
    person_name = Column(String(255), nullable=False)
    person_email = Column(String(255), nullable=False)
    person_contact = Column(String(50), nullable=False, unique=True, index=True)
    person_address = Column(String(500), nullable=False)
    password = Column(String(255), nullable=False)
