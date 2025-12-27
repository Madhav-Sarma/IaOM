from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_roles, get_token_payload
from app.schemas.store import StoreSettingsResponse, StoreSettingsUpdate
from app.models.store import Store

router = APIRouter()

@router.get("/settings", response_model=StoreSettingsResponse, dependencies=[Depends(require_roles(["admin", "staff"]))])
def get_settings(
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing store context")
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    return store


@router.put("/settings", response_model=StoreSettingsResponse, dependencies=[Depends(require_roles(["admin"]))])
def update_settings(
    data: StoreSettingsUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_token_payload),
):
    store_id = payload.get("store_id")
    if not store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing store context")
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    if data.store_name is not None:
        store.store_name = data.store_name
    if data.store_address is not None:
        store.store_address = data.store_address
    store.low_stock_threshold = data.low_stock_threshold
    store.restore_stock_on_cancel = data.restore_stock_on_cancel
    store.sales_lookback_days = data.sales_lookback_days
    store.reorder_horizon_days = data.reorder_horizon_days
    store.currency = data.currency

    db.commit()
    db.refresh(store)
    return store
