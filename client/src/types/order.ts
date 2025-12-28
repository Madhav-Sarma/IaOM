export interface OrderCreate {
  contact: string
  inventory_id: number
  order_quantity: number
}

export interface OrderUpdate {
  inventory_id?: number
  order_quantity?: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'shipped'

export interface OrderStatusUpdate {
  status: OrderStatus
}

export interface OrderResponse {
  order_id: number
  status: OrderStatus
  inventory_id: number
  order_quantity: number
  person_id: number
  created_by: number
  person_contact?: string
  created_at?: string
  unit_price?: number
  prod_name?: string
}

export interface InventoryItem {
  inventory_id: number
  product_id: number
  SKU: string
  prod_name: string
  units: number
  unit_price: number
}
