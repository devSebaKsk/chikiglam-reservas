export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  ASSETS_BUCKET: R2Bucket
  JWT_SECRET: string
  ENVIRONMENT: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
  VAPID_SUBJECT?: string
}

export type UserRole = 'guest' | 'client' | 'employee' | 'organizer' | 'admin' | 'superadmin'

export interface JWTPayload {
  sub: string
  email: string | null
  role: UserRole
  iat: number
  exp: number
}

export interface User {
  id: string
  name: string
  email: string | null
  password_hash: string | null
  phone: string | null
  role: UserRole
  is_active: number
  created_at: string
  updated_at: string
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export type PackCategory = 'carpa' | 'adentro' | 'talleres' | 'grandes' | null

export interface Pack {
  id: string
  name: string
  short_description: string
  full_description: string
  image_key: string | null
  min_people: number
  max_people: number
  is_active: number
  sort_order: number
  category: PackCategory
  created_at: string
  updated_at: string
}

export interface PackPrice {
  id: string
  pack_id: string
  people_count: number
  price: number
}

export interface Resource {
  id: string
  name: string
  quantity: number | null   // null = unlimited
  created_at: string
  updated_at: string
}

export interface PackResource {
  id: string
  pack_id: string
  resource_id: string
  quantity_fixed: number
  quantity_per_person: number
}

export interface Additional {
  id: string
  name: string
  description: string | null
  price: number
  image_key: string | null
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending_payment' | 'pending_confirmation' | 'confirmed' | 'cancelled'

export interface Order {
  id: string
  user_id: string
  pack_id: string
  people_count: number
  date: string
  status: OrderStatus
  total_price: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderAdditional {
  id: string
  order_id: string
  additional_id: string
  quantity: number
  unit_price: number
}

export interface OrderPayment {
  id: string
  order_id: string
  amount: number
  description?: string | null
  registered_by: string
  created_at: string
}

export interface PromoCode {
  id: string
  code: string
  description?: string | null
  discount_type: 'percent' | 'amount'
  discount_value: number
  applicable_pack_ids?: string[] | null
  max_uses?: number | null
  used_count: number
  is_active: number
  expires_at?: string | null
  created_at: string
}

export interface PaymentUpload {
  id: string
  order_id: string
  file_key: string
  uploaded_at: string
}

export interface Setting {
  key: string
  value: string
  updated_at: string
}

/** Shared Hono env type used by all routers that require auth */
export type AppEnv = {
  Bindings: Env
  Variables: { user: JWTPayload }
}

export interface OtpCode {
  id: string
  phone: string
  code: string
  expires_at: string
  used: number
  created_at: string
}

// ─── Legacy (kept for existing routes) ────────────────────────────────────────
export interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  category: string
  image_url: string | null
  is_active: number
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  service_id: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes: string | null
  created_at: string
}

export type ApiResponse<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string }
