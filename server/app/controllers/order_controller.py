from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.order import Order
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.person import Person
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate
from app.core.security import hash_password


ALLOWED_STATUSES = {"pending", "confirmed", "cancelled", "shipped"}


class OrderController:
    @staticmethod
    def _assert_inv_same_store(db: Session, inventory_id: int, store_id: int) -> Inventory:
        inv = db.query(Inventory).filter(Inventory.inventory_id == inventory_id).first()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
        if inv.store_id != store_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inventory belongs to another store")
        return inv

    @staticmethod
    def _get_inventory(db: Session, inventory_id: int) -> Inventory:
        inv = db.query(Inventory).filter(Inventory.inventory_id == inventory_id).first()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
        return inv

    @staticmethod
    def _get_product_for_inventory(db: Session, inventory_id: int) -> Product:
        inv = db.query(Inventory).filter(Inventory.inventory_id == inventory_id).first()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
        prod = db.query(Product).filter(Product.prod_id == inv.product_id).first()
        if not prod:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return prod

    @staticmethod
    def create(db: Session, payload: dict, data: OrderCreate) -> Order:
        # Roles checked at route; ensure store context
        store_id = payload.get("store_id")
        user_id = payload.get("user_id")
        if not store_id or not user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing auth context")

        # Ensure inventory belongs to caller's store
        inv = OrderController._assert_inv_same_store(db, data.inventory_id, store_id)

        # Find or create person by contact
        person = db.query(Person).filter(Person.person_contact == data.contact).first()
        if not person:
            # Create a minimal person record with default password = contact
            person = Person(
                person_name=data.contact,
                person_email=f"{data.contact}@example.com",
                person_contact=data.contact,
                person_address="",
                password=hash_password(data.contact),
            )
            db.add(person)
            db.flush()  # get person_id without full commit yet

        # Create order with pending status
        order = Order(
            status="pending",
            inventory_id=inv.inventory_id,
            created_by=user_id,
            person_id=person.person_id,
            order_quantity=data.order_quantity,
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update(db: Session, payload: dict, order_id: int, data: OrderUpdate) -> Order:
        store_id = payload.get("store_id")
        if not store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing auth context")

        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        # ensure order inventory belongs to same store via inventory
        inv = db.query(Inventory).filter(Inventory.inventory_id == order.inventory_id).first()
        if not inv or inv.store_id != store_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order belongs to another store")

        if order.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending orders can be edited")

        if data.inventory_id is not None:
            new_inv = OrderController._assert_inv_same_store(db, data.inventory_id, store_id)
            order.inventory_id = new_inv.inventory_id

        if data.order_quantity is not None:
            order.order_quantity = data.order_quantity

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update_status(db: Session, payload: dict, order_id: int, new_status: str) -> Order:
        if new_status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

        store_id = payload.get("store_id")
        if not store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing auth context")

        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        inv = db.query(Inventory).filter(Inventory.inventory_id == order.inventory_id).first()
        if not inv or inv.store_id != store_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order belongs to another store")

        # Stock adjustments are done against Product.inventory and Inventory.units
        product = db.query(Product).filter(Product.prod_id == inv.product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        old_status = order.status
        qty = order.order_quantity

        # Define transition effects
        # pending -> confirmed: decrement stock
        # confirmed -> cancelled: restore stock
        # pending -> cancelled: no stock change
        # confirmed -> shipped: no stock change
        # Invalid transitions: shipped -> *, cancelled -> *, * -> pending

        # Validate transitions
        invalid = False
        if old_status == "pending" and new_status in {"confirmed", "cancelled"}:
            pass
        elif old_status == "confirmed" and new_status in {"cancelled", "shipped"}:
            pass
        elif old_status in {"shipped", "cancelled"}:
            invalid = True
        else:
            invalid = True

        if invalid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status transition")

        # Apply stock changes
        if old_status == "pending" and new_status == "confirmed":
            if (product.inventory or 0) < qty or (inv.units or 0) < qty:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
            product.inventory -= qty
            inv.units = (inv.units or 0) - qty
        elif old_status == "confirmed" and new_status == "cancelled":
            product.inventory = (product.inventory or 0) + qty
            inv.units = (inv.units or 0) + qty

        order.status = new_status
        db.commit()
        db.refresh(order)
        return order
