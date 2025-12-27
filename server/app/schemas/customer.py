from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class CustomerCreate(BaseModel):
    person_name: str = Field(..., min_length=1, max_length=255)
    person_contact: str = Field(..., min_length=3, max_length=50)
    person_email: EmailStr
    person_address: str = Field(..., min_length=1, max_length=500)


class CustomerUpdate(BaseModel):
    person_name: Optional[str] = Field(None, min_length=1, max_length=255)
    person_contact: Optional[str] = Field(None, min_length=3, max_length=50)
    person_email: Optional[EmailStr] = None
    person_address: Optional[str] = Field(None, min_length=1, max_length=500)


class CustomerResponse(BaseModel):
    person_id: int
    person_name: str
    person_contact: str
    person_email: EmailStr
    person_address: str

    class Config:
        from_attributes = True


class CustomerExistsResponse(BaseModel):
    exists: bool
    person_id: Optional[int] = None
    person_name: Optional[str] = None
    person_contact: Optional[str] = None
    person_email: Optional[EmailStr] = None