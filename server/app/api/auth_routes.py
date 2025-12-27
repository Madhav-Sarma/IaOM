from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.controllers.auth_controller import AuthController
from app.schemas.auth import (
    SignupRequest, SignupResponse,
    LoginRequest, LoginResponse,
    BuyPackageRequest, BuyPackageResponse,
    CreateStaffRequest, CreateStaffResponse,
    ProfileResponse, ProfileUpdate,
)
from app.core.security import require_roles, get_token_payload

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


@router.post("/create-staff", response_model=CreateStaffResponse, dependencies=[Depends(require_roles(["admin"]))])
def create_staff(
    data: CreateStaffRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    """Create a staff user for the admin's store (admin only)."""
    result = AuthController.create_staff(db, data, payload)
    return CreateStaffResponse(**result)


@router.put("/deactivate-staff/{staff_contact}", dependencies=[Depends(require_roles(["admin"]))])
def deactivate_staff(
    staff_contact: str,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    """Admin deactivates a staff account (sets is_active = False)."""
    result = AuthController.deactivate_staff(db, staff_contact, payload)
    return result

@router.get("/staff-list", dependencies=[Depends(require_roles(["admin", "staff"]))])
def list_staff(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    """List all staff (including admin) for the authenticated user's store."""
    from app.models.user import User
    from app.models.person import Person
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(status_code=400, detail="Store context missing")
    
    staff = (
        db.query(Person.person_id, Person.person_name, Person.person_email, Person.person_contact, User.role, User.is_active)
        .join(User, User.person_id == Person.person_id)
        .filter(User.store_id == store_id)
        .all()
    )
    
    return [
        {
            "person_id": s.person_id,
            "person_name": s.person_name,
            "person_email": s.person_email,
            "person_contact": s.person_contact,
            "role": s.role,
            "is_active": s.is_active,
        }
        for s in staff
    ]


@router.get("/me", response_model=ProfileResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def get_profile(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    return AuthController.get_profile(db, payload)


@router.put("/me", response_model=ProfileResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def update_profile(
    data: ProfileUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    return AuthController.update_profile(db, payload, data)