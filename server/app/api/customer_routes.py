from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.security import require_roles
from app.controllers.customer_controller import CustomerController
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerExistsResponse,
)

router = APIRouter()


@router.get("/", response_model=List[CustomerResponse], dependencies=[Depends(require_roles(["admin", "staff"]))])
def list_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all customers (staff/admin only)."""
    customers = CustomerController.get_all(db, skip=skip, limit=limit)
    return customers


@router.post("/", response_model=CustomerResponse, status_code=201, dependencies=[Depends(require_roles(["admin", "staff"]))])
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    """Create a customer (staff/admin only)."""
    person = CustomerController.create(db, data)
    return person


@router.put("/{contact}", response_model=CustomerResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def update_customer(contact: str, data: CustomerUpdate, db: Session = Depends(get_db)):
    """Edit customer details by contact (staff/admin only)."""
    person = CustomerController.update(db, contact, data)
    if not person:
        raise HTTPException(status_code=404, detail="Customer not found")
    return person


@router.get("/check", response_model=CustomerExistsResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def check_customer(
    contact: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Check for existing customer by contact or email (staff/admin only)."""
    person = None
    if contact:
        person = CustomerController.get_by_contact(db, contact)
    elif email:
        person = CustomerController.get_by_email(db, email)

    if person:
        return CustomerExistsResponse(
            exists=True,
            person_id=person.person_id,
            person_name=person.person_name,
            person_contact=person.person_contact,
            person_email=person.person_email,
        )
    return CustomerExistsResponse(exists=False)