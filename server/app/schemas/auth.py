from pydantic import BaseModel, EmailStr
from typing import Optional
from pydantic import Field
from typing import Literal

# Signup - creates person only
class SignupRequest(BaseModel):
    person_name: str
    person_email: EmailStr
    person_contact: str
    person_address: Optional[str] = ""
    password: Optional[str] = None

class SignupResponse(BaseModel):
    person_id: int
    person_name: str
    person_email: str
    message: str

# Login - staff/admin only
class LoginRequest(BaseModel):
    person_contact: str  # unique phone/contact id
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: Optional[int]
    person_id: int
    person_name: str
    role: Optional[str]
    store_id: Optional[int]
    has_package: bool    
    is_active: bool
# Buy Package - upgrade person to admin, create store
class BuyPackageRequest(BaseModel):
    person_id: int
    store_name: str
    store_address: str

class BuyPackageResponse(BaseModel):
    message: str
    store_id: int
    user_id: int
    access_token: str
    token_type: str = "bearer"

# Admin: create staff user for own store
class CreateStaffRequest(BaseModel):
    person_name: str
    person_email: str  # Allow any email format (validation done on backend if needed)
    person_contact: str  # phone number, unique
    person_address: Optional[str] = ""  # optional
    password: Optional[str] = None  # optional, defaults to 'password'

class CreateStaffResponse(BaseModel):
    message: str
    user_id: int
    person_id: int


# Profile
class ProfileResponse(BaseModel):
    person_id: int
    person_name: str
    person_email: str
    person_contact: str
    person_address: str
    role: Optional[str] = None
    store_id: Optional[int] = None


class ProfileUpdate(BaseModel):
    person_name: Optional[str] = None
    person_email: Optional[str] = None
    person_address: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=4)
