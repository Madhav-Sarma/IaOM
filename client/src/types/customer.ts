export interface CustomerCreate {
  person_name: string
  person_contact: string
  person_email: string
  person_address: string
}

export interface CustomerUpdate {
  person_name?: string
  person_contact?: string
  person_email?: string
  person_address?: string
}

export interface CustomerResponse {
  person_id: number
  person_name: string
  person_contact: string
  person_email: string
  person_address: string
}

export interface CustomerExistsResponse {
  exists: boolean
  person_id?: number
  person_name?: string
  person_contact?: string
  person_email?: string
}
