export interface SignupRequest {
  person_name: string
  person_email: string
  person_contact: string
  person_address: string
}

export interface SignupResponse {
  person_id: number
  person_name: string
  person_email: string
  message: string
}

export interface LoginRequest {
  person_email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: number
  person_id: number
  role: string
  store_id: number
}

export interface BuyPackageRequest {
  person_id: number
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
