export interface ProductCreate {
  name: string
  sku: string
  price: number
  stock_quantity: number
}

export interface ProductUpdate {
  name?: string
  sku?: string
  price?: number
  stock_quantity?: number
}

export interface ProductResponse extends ProductCreate {
  id: number
  created_at: string
  updated_at: string
}
