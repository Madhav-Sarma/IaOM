from pydantic import BaseModel, EmailStr
from typing import Optional

# Signup - creates person only
class SignupRequest(BaseModel):
    person_name: str
    person_email: EmailStr
    person_contact: str
    person_address: str

class SignupResponse(BaseModel):
    person_id: int
    person_name: str
    person_email: str
    message: str

# Login - staff/admin only
class LoginRequest(BaseModel):
    person_email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    person_id: int
    role: str
    store_id: int

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
