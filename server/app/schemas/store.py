from pydantic import BaseModel, Field
from typing import Optional

class StoreSettingsResponse(BaseModel):
    store_name: str
    store_address: str
    low_stock_threshold: int
    restore_stock_on_cancel: bool
    sales_lookback_days: int
    reorder_horizon_days: int
    currency: str

    class Config:
        from_attributes = True


class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    store_address: Optional[str] = Field(default=None, min_length=1, max_length=500)
    low_stock_threshold: int = Field(default=10, ge=0)
    restore_stock_on_cancel: bool = True
    sales_lookback_days: int = Field(default=30, ge=0)
    reorder_horizon_days: int = Field(default=7, ge=0)
    currency: str = Field(default="₹", min_length=1, max_length=8)
