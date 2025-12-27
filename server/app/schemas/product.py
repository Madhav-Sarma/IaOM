from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class ProductCreate(BaseModel):
    SKU: str
    prod_name: str
    prod_category: str
    prod_description: Optional[str] = None
    unit_price: Decimal
    inventory: int = 0

class ProductUpdate(BaseModel):
    prod_name: Optional[str] = None
    prod_category: Optional[str] = None
    prod_description: Optional[str] = None
    unit_price: Optional[Decimal] = None

class ProductInventoryUpdate(BaseModel):
    inventory: int  # New inventory quantity

class ProductResponse(BaseModel):
    prod_id: int
    store_id: int
    SKU: str
    prod_name: str
    prod_category: str
    prod_description: Optional[str]
    unit_price: Decimal
    inventory: int

    class Config:
        from_attributes = True
