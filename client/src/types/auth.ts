export interface SignupRequest {
  person_name: string
  person_email: string
  person_contact: string
  person_address: string
  password: string
}

export interface SignupResponse {
  person_id: number
  person_name: string
  person_email: string
  message: string
}

export interface LoginRequest {
  person_contact: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: number | null
  person_id: number
  person_name: string
  role: string | null
  store_id: number | null
  has_package: boolean
  is_active: boolean
}

export interface BuyPackageRequest {
  person_contact: string
  store_name: string
  store_address: string
}

export interface BuyPackageResponse {
  message: string
  store_id: number
  user_id: number
  access_token: string
  token_type: string
}

export interface CreateStaffRequest {
  person_name: string
  person_email: string
  person_contact: string
  person_address: string
  password?: string
}

export interface CreateStaffResponse {
  message: string
  user_id: number
  person_id: number
}
