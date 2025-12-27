from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal


class OrderCreate(BaseModel):
    contact: str = Field(..., description="Customer contact (phone)")
    inventory_id: int
    order_quantity: int = Field(..., ge=1)


class OrderUpdate(BaseModel):
    inventory_id: Optional[int] = None
    order_quantity: Optional[int] = Field(None, ge=1)


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "cancelled", "shipped"]


class OrderResponse(BaseModel):
    order_id: int
    status: str
    inventory_id: int
    order_quantity: int
    person_id: int
    created_by: int
    person_contact: Optional[str] = None
    created_at: datetime
    unit_price: Optional[Decimal] = None

    class Config:
        from_attributes = True


class InventoryItemResponse(BaseModel):
    inventory_id: int
    product_id: int
    SKU: str
    prod_name: str
    units: int
    unit_price: Decimal
