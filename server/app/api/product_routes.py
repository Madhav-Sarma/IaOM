from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_roles
from app.controllers.product_controller import ProductController
from app.schemas.product import ProductCreate, ProductUpdate, ProductInventoryUpdate, ProductResponse

# Do not set tags here; api_router.include_router will assign consistent tags
router = APIRouter()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin", "staff"]))
):
    """Admin or staff creates a new product."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.create_product(db, data, store_id)

@router.get("", response_model=list[ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin", "staff"]))
):
    """Get all products for the authenticated user's store."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.get_products(db, store_id, skip, limit)

@router.get("/{prod_id}", response_model=ProductResponse)
def get_product(
    prod_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin", "staff"]))
):
    """Get a specific product by ID."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.get_product_by_id(db, prod_id, store_id)

@router.put("/{prod_id}", response_model=ProductResponse)
def update_product(
    prod_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin", "staff"]))
):
    """Admin or staff updates product details (name, category, description, price)."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.update_product_details(db, prod_id, store_id, data)

@router.put("/{prod_id}/inventory", response_model=ProductResponse)
def update_inventory(
    prod_id: int,
    data: ProductInventoryUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin", "staff"]))
):
    """Admin/Staff updates product inventory."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.update_inventory(db, prod_id, store_id, data)

@router.delete("/{prod_id}", status_code=status.HTTP_200_OK)
def delete_product(
    prod_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin"]))
):
    """Admin deletes a product."""
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.delete_product(db, prod_id, store_id)


@router.post("/backfill-inventory")
def backfill_inventory(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles(["admin"]))
):
    """Admin utility: create missing Inventory rows for this store.
    Units initialized from Product.inventory. Does not overwrite existing rows.
    """
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store context missing"
        )
    return ProductController.backfill_inventory_for_store(db, store_id)
