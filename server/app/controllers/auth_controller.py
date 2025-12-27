from sqlalchemy.orm import Session
from typing import Optional
from app.models.person import Person
from app.models.user import User
from app.models.store import Store
from app.schemas.auth import SignupRequest, LoginRequest, BuyPackageRequest
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status

class AuthController:
    
    @staticmethod
    def signup(db: Session, data: SignupRequest) -> Person:
        """Create a new person (customer) account."""
        # Check if email already exists
        existing = db.query(Person).filter(Person.person_email == data.person_email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create person record
        person = Person(
            person_name=data.person_name,
            person_email=data.person_email,
            person_contact=data.person_contact,
            person_address=data.person_address
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        return person
    
    @staticmethod
    def login(db: Session, data: LoginRequest) -> dict:
        """Login for staff/admin users only."""
        # Find person by email
        person = db.query(Person).filter(Person.person_email == data.person_email).first()
        if not person:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user exists (staff/admin only)
        user = db.query(User).filter(User.person_id == person.person_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Only staff and admin can login."
            )
        
        # Verify password
        if not verify_password(data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Create access token
        access_token = create_access_token(
            data={
                "user_id": user.user_id,
                "person_id": person.person_id,
                "role": user.role,
                "store_id": user.store_id
            }
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.user_id,
            "person_id": person.person_id,
            "role": user.role,
            "store_id": user.store_id
        }
    
    @staticmethod
    def buy_package(db: Session, data: BuyPackageRequest) -> dict:
        """Upgrade person to admin, create store, add to users table."""
        # Check if person exists
        person = db.query(Person).filter(Person.person_id == data.person_id).first()
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Person not found"
            )
        
        # Check if person is already a user
        existing_user = db.query(User).filter(User.person_id == data.person_id).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Person is already a staff or admin"
            )
        
        # Create store
        store = Store(
            store_name=data.store_name,
            store_address=data.store_address
        )
        db.add(store)
        db.commit()
        db.refresh(store)
        
        # Create admin user with default password
        hashed_pwd = hash_password("password")
        user = User(
            person_id=person.person_id,
            role="admin",
            store_id=store.store_id,
            password=hashed_pwd,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create access token
        access_token = create_access_token(
            data={
                "user_id": user.user_id,
                "person_id": person.person_id,
                "role": user.role,
                "store_id": store.store_id
            }
        )
        
        return {
            "message": "Package purchased successfully. Default password is 'password'. Please change it in your profile.",
            "store_id": store.store_id,
            "user_id": user.user_id,
            "access_token": access_token,
            "token_type": "bearer"
        }
