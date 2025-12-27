from sqlalchemy.orm import Session
from typing import Optional
from fastapi import HTTPException, status
from app.models.person import Person
from app.schemas.customer import CustomerCreate, CustomerUpdate


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
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> list:
        return db.query(Person).offset(skip).limit(limit).all()

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

        person = Person(**data.model_dump())
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