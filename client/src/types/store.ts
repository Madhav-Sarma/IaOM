export interface StoreSettings {
  low_stock_threshold: number
  restore_stock_on_cancel: boolean
  sales_lookback_days: number
  reorder_horizon_days: number
  currency: string
}
