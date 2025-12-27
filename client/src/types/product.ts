export interface ProductCreate {
  SKU: string
  prod_name: string
  prod_category: string
  prod_description?: string
  unit_price: number
  inventory: number
}

export interface ProductUpdate {
  prod_name?: string
  prod_category?: string
  prod_description?: string
  unit_price?: number
}

export interface ProductInventoryUpdate {
  add_quantity: number
}

export interface ProductResponse {
  prod_id: number
  store_id: number
  SKU: string
  prod_name: string
  prod_category: string
  prod_description?: string
  unit_price: number
  inventory: number
}
