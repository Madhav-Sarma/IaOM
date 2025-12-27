from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.core.security import require_roles, get_token_payload
from app.controllers.customer_controller import CustomerController
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerExistsResponse,
)

router = APIRouter()


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


@router.get("/{contact}", response_model=CustomerResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def get_customer(contact: str, db: Session = Depends(get_db)):
    """Get a single customer by contact (staff/admin only)."""
    person = CustomerController.get_by_contact(db, contact)
    if not person:
        raise HTTPException(status_code=404, detail="Customer not found")
    return person

@router.get("", response_model=List[CustomerResponse], dependencies=[Depends(require_roles(["admin", "staff"]))])
def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    """List all customers for the authenticated user's store (staff/admin only)."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=400,
            detail="Store context missing"
        )
    customers = CustomerController.get_all(db, skip=skip, limit=limit, store_id=store_id)
    return customers


@router.post("", response_model=CustomerResponse, status_code=201, dependencies=[Depends(require_roles(["admin", "staff"]))])
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