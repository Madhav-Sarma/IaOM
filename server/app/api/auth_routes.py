from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.controllers.auth_controller import AuthController
from app.schemas.auth import (
    SignupRequest, SignupResponse,
    LoginRequest, LoginResponse,
    BuyPackageRequest, BuyPackageResponse
)

router = APIRouter()

@router.post("/signup", response_model=SignupResponse, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    """
    Sign up as a new person (customer).
    Creates a person record only - cannot login until upgraded to staff/admin.
    """
    person = AuthController.signup(db, data)
    return SignupResponse(
        person_id=person.person_id,
        person_name=person.person_name,
        person_email=person.person_email,
        message="Signup successful! You are now a customer. Buy a package to become an admin and manage your store."
    )

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login for staff and admin users only.
    Customers cannot login to the web app.
    """
    result = AuthController.login(db, data)
    return LoginResponse(**result)

@router.post("/buy-package", response_model=BuyPackageResponse)
def buy_package(data: BuyPackageRequest, db: Session = Depends(get_db)):
    """
    Buy a package to become an admin and create your store.
    Upgrades a person to admin role, creates a store, and adds to users table.
    Default password is 'password' - change it after login.
    """
    result = AuthController.buy_package(db, data)
    return BuyPackageResponse(**result)
