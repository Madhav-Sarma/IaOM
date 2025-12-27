from sqlalchemy.orm import Session
from typing import Optional
from fastapi import HTTPException, status
from app.models.person import Person
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.core.security import hash_password


class CustomerController:
    @staticmethod
    def get_by_contact(db: Session, contact: str) -> Optional[Person]:
        return db.query(Person).filter(Person.person_contact == contact).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Person]:
        return db.query(Person).filter(Person.person_email == email).first()

    @staticmethod
    def get_by_id(db: Session, person_id: int) -> Optional[Person]:
        return db.query(Person).filter(Person.person_id == person_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, store_id: Optional[int] = None) -> list:
        """Get all customers (persons who placed orders); optionally filter by store_id."""
        query = db.query(Person).distinct()
        if store_id:
            # Join Person -> Order -> Inventory -> filter by store_id
            from app.models.order import Order
            from app.models.inventory import Inventory
            query = (
                query.join(Order, Order.person_id == Person.person_id)
                .join(Inventory, Inventory.inventory_id == Order.inventory_id)
                .filter(Inventory.store_id == store_id)
            )
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, data: CustomerCreate) -> Person:
        # Enforce uniqueness on contact
        if CustomerController.get_by_contact(db, data.person_contact):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer with this contact already exists"
            )

        # Optional: prevent duplicate emails if desired
        if CustomerController.get_by_email(db, data.person_email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer with this email already exists"
            )

        # Create person with default password (customers created by admin/staff)
        person_data = data.model_dump()
        person_data['password'] = hash_password(data.person_contact)  # Password = contact number by default
        person = Person(**person_data)
        db.add(person)
        db.commit()
        db.refresh(person)
        return person

    @staticmethod
    def update(db: Session, contact: str, data: CustomerUpdate) -> Optional[Person]:
        person = CustomerController.get_by_contact(db, contact)
        if not person:
            return None

        payload = data.model_dump(exclude_unset=True)

        # If contact is being updated, ensure uniqueness
        new_contact = payload.get("person_contact")
        if new_contact and new_contact != person.person_contact:
            if CustomerController.get_by_contact(db, new_contact):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Another customer with this contact already exists"
                )

        # If email is being updated, optionally ensure uniqueness
        new_email = payload.get("person_email")
        if new_email and new_email != person.person_email:
            if CustomerController.get_by_email(db, new_email):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Another customer with this email already exists"
                )

        for key, value in payload.items():
            setattr(person, key, value)
        db.commit()
        db.refresh(person)
        return person