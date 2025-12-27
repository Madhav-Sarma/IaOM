export interface StoreSettings {
  store_name: string
  store_address: string
  low_stock_threshold: number
  restore_stock_on_cancel: boolean
  sales_lookback_days: number
  reorder_horizon_days: number
  currency: string
}
