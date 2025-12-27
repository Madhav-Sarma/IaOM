from pydantic import BaseModel, Field

class StoreSettingsResponse(BaseModel):
    low_stock_threshold: int
    restore_stock_on_cancel: bool
    sales_lookback_days: int
    reorder_horizon_days: int
    currency: str

    class Config:
        from_attributes = True


class StoreSettingsUpdate(BaseModel):
    low_stock_threshold: int = Field(default=10, ge=0)
    restore_stock_on_cancel: bool = True
    sales_lookback_days: int = Field(default=30, ge=0)
    reorder_horizon_days: int = Field(default=7, ge=0)
    currency: str = Field(default="₹", min_length=1, max_length=8)
