from sqlalchemy.orm import Session
from typing import Optional
from app.models.person import Person
from app.models.user import User
from app.models.store import Store
from app.schemas.auth import SignupRequest, LoginRequest, BuyPackageRequest, CreateStaffRequest, ProfileUpdate
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException, status

class AuthController:
    
    @staticmethod
    def signup(db: Session, data: SignupRequest) -> Person:
        """Create a new person (customer) account with password."""
        # Check if person already exists (may have been created as customer by admin/staff)
        existing_contact = db.query(Person).filter(Person.person_contact == data.person_contact).first()
        if existing_contact:
            # Check if they're already a user (have bought package)
            existing_user = db.query(User).filter(User.person_id == existing_contact.person_id).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Account already exists. Please login or buy a package to upgrade."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Account already exists for this contact. Your default password is your contact number ({data.person_contact}). Please login and buy a package to start your store."
                )
        
        # Check if email already exists
        existing = db.query(Person).filter(Person.person_email == data.person_email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password (default to contact if password not provided)
        raw_pwd = data.password or data.person_contact
        hashed_pwd = hash_password(raw_pwd)
        
        # Create person record with password
        person = Person(
            person_name=data.person_name,
            person_email=data.person_email,
            person_contact=data.person_contact,
            person_address=data.person_address or "",
            password=hashed_pwd
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        return person
    
    @staticmethod
    def login(db: Session, data: LoginRequest) -> dict:
        """Login for anyone - check if they have purchased a package."""
        # Find person by unique contact
        person = db.query(Person).filter(Person.person_contact == data.person_contact).first()
        if not person:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contact does not exist"
            )
        
        # Verify password
        if not verify_password(data.password, person.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Password is incorrect"
            )
        
        # Check if person has bought a package (is staff/admin)
        user = db.query(User).filter(User.person_id == person.person_id).first()
        
        has_package = user is not None
        
        # Create access token
        access_token = create_access_token(
            data={
                "person_id": person.person_id,
                "user_id": user.user_id if user else None,
                "role": user.role if user else None,
                "store_id": user.store_id if user else None
            }
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.user_id if user else None,
            "person_id": person.person_id,
            "person_name": person.person_name,
            "role": user.role if user else None,
            "store_id": user.store_id if user else None,
            "has_package": has_package
        }
    
    @staticmethod
    def buy_package(db: Session, data: BuyPackageRequest) -> dict:
        """Upgrade person to admin, create store, add to users table."""
        # Check if person exists via unique contact
        person = db.query(Person).filter(Person.person_contact == data.person_contact).first()
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Person not found. Please signup first before buying a package."
            )
        
        # Check if person is already a user
        existing_user = db.query(User).filter(User.person_id == person.person_id).first()
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
        
        # Create admin user (password stored in person table, not here)
        user = User(
            person_id=person.person_id,
            role="admin",
            store_id=store.store_id,
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
            "message": "Package purchased successfully. You are now an admin.",
            "store_id": store.store_id,
            "user_id": user.user_id,
            "access_token": access_token,
            "token_type": "bearer"
        }

    @staticmethod
    def create_staff(db: Session, data: CreateStaffRequest, creator_payload: dict) -> dict:
        """Admin creates a staff user for their store using unique contact (phone).
        Existing contacts can be used if not registered to another store."""
        # Ensure caller is admin (route dependency already checks, but double-safety)
        if creator_payload.get("role") != "admin":
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can create staff")

        store_id = creator_payload.get("store_id")
        if not store_id:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing store context")

        from app.models.person import Person
        from app.core.security import hash_password
        
        # Check if person with this contact already exists
        existing_person = db.query(Person).filter(Person.person_contact == data.person_contact).first()
        
        if existing_person:
            # Check if they already have a user record
            existing_user = db.query(User).filter(User.person_id == existing_person.person_id).first()
            
            if existing_user:
                # If registered to a different store, reject
                if existing_user.store_id != store_id:
                    from fastapi import HTTPException, status
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT, 
                        detail="This contact is already registered to another store"
                    )
                # If already a user in this store, reject (already staff/admin)
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, 
                    detail="This contact is already a staff member in your store"
                )
            
            # Person exists but has no user record - create staff user for them
            user = User(
                person_id=existing_person.person_id,
                role="staff",
                store_id=store_id,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            return {
                "message": "Existing contact added as staff successfully.",
                "user_id": user.user_id,
                "person_id": existing_person.person_id,
            }
        
        # Check email uniqueness for new person
        existing_email = db.query(Person).filter(Person.person_email == data.person_email).first()
        if existing_email:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Person with this email already exists")

        # Create new person with provided password or default
        raw_pwd = data.password or "password"
        hashed_pwd = hash_password(raw_pwd)
        
        person = Person(
            person_name=data.person_name,
            person_email=data.person_email,
            person_contact=data.person_contact,
            person_address=data.person_address,
            password=hashed_pwd
        )
        db.add(person)
        db.commit()
        db.refresh(person)

        # Create staff user
        user = User(
            person_id=person.person_id,
            role="staff",
            store_id=store_id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "message": "Staff user created successfully.",
            "user_id": user.user_id,
            "person_id": person.person_id,
        }
    
    @staticmethod
    def deactivate_staff(db: Session, staff_contact: str, admin_payload: dict) -> dict:
        """Admin deactivates a staff account by setting is_active = False."""
        # Ensure caller is admin
        if admin_payload.get("role") != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can deactivate staff")
        
        admin_store_id = admin_payload.get("store_id")
        if not admin_store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing store context")
        
        # Find person by contact
        person = db.query(Person).filter(Person.person_contact == staff_contact).first()
        if not person:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
        
        # Find user linked to this person
        user = db.query(User).filter(User.person_id == person.person_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
        
        # Verify the staff belongs to the same store
        if user.store_id != admin_store_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot deactivate staff from another store")
        
        # Verify it's a staff account, not admin
        if user.role == "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate admin account")
        
        # Check if already inactive
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff account is already inactive")
        
        # Deactivate
        user.is_active = False
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Staff account deactivated successfully",
            "user_id": user.user_id,
            "person_contact": staff_contact
        }

    @staticmethod
    def get_profile(db: Session, payload: dict) -> dict:
        person_id = payload.get("person_id")
        if not person_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing person context")
        person = db.query(Person).filter(Person.person_id == person_id).first()
        if not person:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
        user = db.query(User).filter(User.person_id == person.person_id).first()
        return {
            "person_id": person.person_id,
            "person_name": person.person_name,
            "person_email": person.person_email,
            "person_contact": person.person_contact,
            "person_address": person.person_address,
            "role": user.role if user else None,
            "store_id": user.store_id if user else None,
        }

    @staticmethod
    def update_profile(db: Session, payload: dict, data: ProfileUpdate) -> dict:
        person_id = payload.get("person_id")
        if not person_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing person context")
        person = db.query(Person).filter(Person.person_id == person_id).first()
        if not person:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

        # Apply updates
        if data.person_name is not None:
            person.person_name = data.person_name
        if data.person_email is not None:
            person.person_email = data.person_email
        if data.person_address is not None:
            person.person_address = data.person_address
        if data.password:
            person.password = hash_password(data.password)

        db.commit()
        db.refresh(person)

        user = db.query(User).filter(User.person_id == person.person_id).first()
        return {
            "person_id": person.person_id,
            "person_name": person.person_name,
            "person_email": person.person_email,
            "person_contact": person.person_contact,
            "person_address": person.person_address,
            "role": user.role if user else None,
            "store_id": user.store_id if user else None,
        }
