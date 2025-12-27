export interface Profile {
  person_id: number
  person_name: string
  person_email: string
  person_contact: string
  person_address: string
  role?: string | null
  store_id?: number | null
}

export interface ProfileUpdate {
  person_name?: string
  person_email?: string
  person_address?: string
  password?: string
}
