from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.inventory import Inventory
from app.models.order import Order
from app.schemas.product import ProductCreate, ProductUpdate, ProductInventoryUpdate
from fastapi import HTTPException, status

class ProductController:

    @staticmethod
    def create_product(db: Session, data: ProductCreate, store_id: int) -> Product:
        """Admin creates a new product for their store."""
        # Check if SKU already exists in this store
        existing = db.query(Product).filter(
            Product.SKU == data.SKU,
            Product.store_id == store_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU already exists in your store"
            )
        
        product = Product(
            store_id=store_id,
            SKU=data.SKU,
            prod_name=data.prod_name,
            prod_category=data.prod_category,
            prod_description=data.prod_description,
            unit_price=data.unit_price,
            inventory=data.inventory
        )
        db.add(product)
        db.flush()  # get prod_id without full commit

        # Ensure an Inventory row exists for this product and store
        inv = db.query(Inventory).filter(
            Inventory.store_id == store_id,
            Inventory.product_id == product.prod_id,
        ).first()
        if not inv:
            inv = Inventory(store_id=store_id, product_id=product.prod_id, units=product.inventory or 0)
            db.add(inv)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def get_products(db: Session, store_id: int, skip: int = 0, limit: int = 100) -> list:
        """Get all products for a store."""
        return db.query(Product).filter(Product.store_id == store_id).offset(skip).limit(limit).all()

    @staticmethod
    def get_product_by_id(db: Session, prod_id: int, store_id: int) -> Product:
        """Get a specific product by ID (must belong to store)."""
        product = db.query(Product).filter(
            Product.prod_id == prod_id,
            Product.store_id == store_id
        ).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        return product

    @staticmethod
    def update_product_details(db: Session, prod_id: int, store_id: int, data: ProductUpdate) -> Product:
        """Admin updates product details (name, category, description, price)."""
        product = ProductController.get_product_by_id(db, prod_id, store_id)
        
        # Update only provided fields
        if data.prod_name is not None:
            product.prod_name = data.prod_name
        if data.prod_category is not None:
            product.prod_category = data.prod_category
        if data.prod_description is not None:
            product.prod_description = data.prod_description
        if data.unit_price is not None:
            product.unit_price = data.unit_price
        
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def backfill_inventory_for_store(db: Session, store_id: int) -> dict:
        """Ensure every product in the store has a matching Inventory row.
        Does not overwrite existing rows; creates only missing ones.
        Units initialized from Product.inventory.
        """
        products = db.query(Product).filter(Product.store_id == store_id).all()
        created = 0
        for p in products:
            inv = db.query(Inventory).filter(
                Inventory.store_id == store_id,
                Inventory.product_id == p.prod_id,
            ).first()
            if not inv:
                inv = Inventory(store_id=store_id, product_id=p.prod_id, units=p.inventory or 0)
                db.add(inv)
                created += 1
        if created:
            db.commit()
        return {"created": created, "total_products": len(products)}

    @staticmethod
    def update_inventory(db: Session, prod_id: int, store_id: int, data: ProductInventoryUpdate) -> Product:
        """Admin/Staff adds stock to product inventory."""
        product = ProductController.get_product_by_id(db, prod_id, store_id)
        product.inventory += data.add_quantity

        # Keep Inventory.units in sync for this store/product
        inv = db.query(Inventory).filter(
            Inventory.store_id == store_id,
            Inventory.product_id == product.prod_id,
        ).first()
        if inv:
            inv.units += data.add_quantity
        else:
            inv = Inventory(store_id=store_id, product_id=product.prod_id, units=product.inventory)
            db.add(inv)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete_product(db: Session, prod_id: int, store_id: int) -> dict:
        """Admin deletes a product. Cancels all pending orders and removes inventory."""
        product = ProductController.get_product_by_id(db, prod_id, store_id)
        
        # Find all inventory entries for this product
        inventories = db.query(Inventory).filter(
            Inventory.product_id == prod_id,
            Inventory.store_id == store_id
        ).all()
        
        inventory_ids = [inv.inventory_id for inv in inventories]
        
        cancelled_orders = 0
        if inventory_ids:
            # Cancel all pending orders for these inventory items
            pending_orders = db.query(Order).filter(
                Order.inventory_id.in_(inventory_ids),
                Order.status == 'pending'
            ).all()
            
            for order in pending_orders:
                order.status = 'cancelled'
                cancelled_orders += 1
            
            # Delete all inventory entries
            for inv in inventories:
                db.delete(inv)
        
        # Delete the product
        db.delete(product)
        db.commit()
        
        return {
            "message": "Product deleted successfully",
            "cancelled_orders": cancelled_orders
        }
