from fastapi import APIRouter, Depends, status
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_roles, get_token_payload
from app.controllers.order_controller import OrderController
from app.schemas.order import OrderCreate, OrderUpdate, OrderStatusUpdate, OrderResponse, InventoryItemResponse

# Do not set tags here; api_router.include_router will assign consistent tags
router = APIRouter()


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(["admin", "staff"]))])
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    from app.models.person import Person
    from app.models.inventory import Inventory
    from app.models.product import Product
    order = OrderController.create(db, payload, data)
    # Include person_contact and unit_price in response for client convenience
    person = db.query(Person).filter(Person.person_id == order.person_id).first()
    inv = db.query(Inventory).filter(Inventory.inventory_id == order.inventory_id).first()
    product = db.query(Product).filter(Product.prod_id == inv.product_id).first() if inv else None
    return dict(
        order_id=order.order_id,
        status=order.status,
        inventory_id=order.inventory_id,
        order_quantity=order.order_quantity,
        person_id=order.person_id,
        created_by=order.created_by,
        created_at=order.created_at,
        person_contact=person.person_contact if person else None,
        unit_price=float(product.unit_price) if product and product.unit_price else 0,
    )


@router.put("/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def update_order(
    order_id: int,
    data: OrderUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    order = OrderController.update(db, payload, order_id, data)
    return order


@router.put("/{order_id}/status", response_model=OrderResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    order = OrderController.update_status(db, payload, order_id, data.status)
    return order


@router.get("", response_model=list[OrderResponse], dependencies=[Depends(require_roles(["admin", "staff"]))])
def list_orders(
    status: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    customer_contact: str | None = None,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    # List orders for this store with optional filters
    from app.models.order import Order
    from app.models.inventory import Inventory
    from app.models.person import Person
    from app.models.product import Product
    store_id = payload.get("store_id")

    query = (
        db.query(
            Order.order_id,
            Order.status,
            Order.inventory_id,
            Order.order_quantity,
            Order.person_id,
            Order.created_by,
            Order.created_at,
            Person.person_contact,
            Product.unit_price,
        )
        .join(Inventory, Inventory.inventory_id == Order.inventory_id)
        .join(Person, Person.person_id == Order.person_id)
        .join(Product, Product.prod_id == Inventory.product_id)
        .filter(Inventory.store_id == store_id)
    )

    if status:
        query = query.filter(Order.status == status)
    if start_date:
        query = query.filter(Order.created_at >= start_date)
    if end_date:
        query = query.filter(Order.created_at <= end_date)
    if customer_contact:
        query = query.filter(Person.person_contact == customer_contact)

    rows = query.order_by(Order.created_at.desc()).all()

    return [
        dict(
            order_id=r.order_id,
            status=r.status,
            inventory_id=r.inventory_id,
            order_quantity=r.order_quantity,
            person_id=r.person_id,
            created_by=r.created_by,
            created_at=r.created_at,
            person_contact=r.person_contact,
            unit_price=float(r.unit_price) if r.unit_price else 0,
        )
        for r in rows
    ]


@router.get("/inventory", response_model=list[InventoryItemResponse], dependencies=[Depends(require_roles(["admin", "staff"]))])
def list_store_inventory(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    from app.models.inventory import Inventory
    from app.models.product import Product
    store_id = payload.get("store_id")
    rows = (
        db.query(
            Inventory.inventory_id,
            Product.prod_id.label("product_id"),
            Product.SKU,
            Product.prod_name,
            Inventory.units,
            Product.unit_price,
        )
        .join(Product, Product.prod_id == Inventory.product_id)
        .filter(Inventory.store_id == store_id)
        .all()
    )
    # Return plain dicts; FastAPI will coerce to InventoryItemResponse
    return [
        dict(
            inventory_id=r.inventory_id,
            product_id=r.product_id,
            SKU=r.SKU,
            prod_name=r.prod_name,
            units=r.units or 0,
            unit_price=r.unit_price,
        )
        for r in rows
    ]


@router.get("/{order_id}", response_model=OrderResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    from app.models.order import Order
    from app.models.inventory import Inventory
    from app.models.person import Person
    store_id = payload.get("store_id")
    r = (
        db.query(
            Order.order_id,
            Order.status,
            Order.inventory_id,
            Order.order_quantity,
            Order.person_id,
            Order.created_by,
            Order.created_at,
            Person.person_contact,
        )
        .join(Inventory, Inventory.inventory_id == Order.inventory_id)
        .join(Person, Person.person_id == Order.person_id)
        .filter(Order.order_id == order_id, Inventory.store_id == store_id)
        .first()
    )
    if not r:
        return None
    return dict(
        order_id=r.order_id,
        status=r.status,
        inventory_id=r.inventory_id,
        order_quantity=r.order_quantity,
        person_id=r.person_id,
        created_by=r.created_by,
        created_at=r.created_at,
        person_contact=r.person_contact,
    )


@router.get("/{order_id}/receipt", dependencies=[Depends(require_roles(["admin", "staff"]))])
def get_receipt(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    """Return all orders in the same checkout batch as the given order_id.
    Groups by same person and created_by within a short time window around created_at.
    """
    from datetime import timedelta
    from app.models.order import Order
    from app.models.inventory import Inventory
    from app.models.product import Product
    from app.models.person import Person

    store_id = payload.get("store_id")

    base = (
        db.query(Order, Person)
        .join(Person, Person.person_id == Order.person_id)
        .join(Inventory, Inventory.inventory_id == Order.inventory_id)
        .filter(Order.order_id == order_id, Inventory.store_id == store_id)
        .first()
    )
    if not base:
        return {"order_id": order_id, "person_contact": None, "lines": []}

    base_order, person = base
    window = timedelta(seconds=120)
    start = base_order.created_at - window
    end = base_order.created_at + window

    rows = (
        db.query(
            Order.order_id,
            Order.status,
            Order.inventory_id,
            Order.order_quantity,
            Order.created_at,
            Product.SKU,
            Product.prod_name,
            Product.unit_price,
        )
        .join(Inventory, Inventory.inventory_id == Order.inventory_id)
        .join(Product, Product.prod_id == Inventory.product_id)
        .filter(
            Inventory.store_id == store_id,
            Order.person_id == base_order.person_id,
            Order.created_by == base_order.created_by,
            Order.created_at.between(start, end),
        )
        .order_by(Order.created_at.asc())
        .all()
    )

    lines = [
        dict(
            order_id=r.order_id,
            status=r.status,
            inventory_id=r.inventory_id,
            SKU=r.SKU,
            prod_name=r.prod_name,
            quantity=r.order_quantity,
            unit_price=float(r.unit_price),
            subtotal=float(r.unit_price) * r.order_quantity,
            created_at=r.created_at,
        )
        for r in rows
    ]

    return {
        "order_id": order_id,
        "person_id": person.person_id,
        "person_name": person.person_name,
        "person_contact": person.person_contact,
        "person_email": person.person_email,
        "person_address": person.person_address,
        "created_at": base_order.created_at,
        "lines": lines,
        "grand_total": sum(l["subtotal"] for l in lines),
    }
