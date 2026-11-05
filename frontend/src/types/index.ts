// ─── Auth & Users ─────────────────────────────────────────────────────────────
export type UserRole = 'guest' | 'client' | 'employee' | 'organizer' | 'admin' | 'superadmin'

export interface User {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role: UserRole
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface LoginPayload  { email: string; password: string }
export interface RegisterPayload { name: string; email: string; password: string; phone?: string }
export interface RequestOtpPayload { phone: string; name?: string }
export interface VerifyOtpPayload  { phone: string; code: string }

// ─── Domain Types ─────────────────────────────────────────────────────────────
export type PackCategory = 'carpa' | 'adentro' | 'talleres' | 'grandes' | null

export interface Pack {
  id: string
  name: string
  shortDescription: string
  fullDescription: string
  imageKey?: string | null
  minPeople: number
  maxPeople: number
  isActive: boolean
  isHidden: boolean
  sortOrder: number
  category: PackCategory
  prices?: PackPrice[]
  resources?: PackResourceWithName[]
  createdAt?: string
}

export interface PackPrice {
  id: string
  packId: string
  peopleCount: number
  price: number
}

export interface PackResourceWithName {
  id: string
  packId: string
  resourceId: string
  resourceName: string
  resourceStock: number | null   // null = unlimited
  quantityFixed: number
  quantityPerPerson: number
}

export interface Resource {
  id: string
  name: string
  quantity: number | null   // null = unlimited
  createdAt?: string
  updatedAt?: string
}

export interface Additional {
  id: string
  name: string
  description?: string | null
  price: number
  imageKey?: string | null
  isActive: boolean
  sortOrder: number
  applicablePackIds?: string[] | null
}

export type OrderStatus = 'pending_payment' | 'pending_confirmation' | 'confirmed' | 'cancelled' | 'completed'

export interface Order {
  id: string
  userId: string
  packId: string
  packName?: string
  packImageKey?: string | null
  userName?: string
  userPhone?: string
  peopleCount: number
  date: string
  status: OrderStatus
  totalPrice: number
  notes?: string | null
  additionals?: OrderAdditionalItem[]
  uploads?: PaymentUploadItem[]
  createdAt: string
  updatedAt?: string
}

export interface OrderAdditionalItem {
  id: string
  orderId: string
  additionalId: string
  additionalName: string
  quantity: number
  unitPrice: number
}

export interface PaymentUploadItem {
  id: string
  orderId: string
  fileKey: string
  uploadedAt: string
}

export interface OrderPayment {
  id: string
  orderId: string
  amount: number
  description?: string | null
  registeredBy: string
  createdAt: string
}

export interface CreateOrderPayload {
  pack_id: string
  people_count: number
  date: string
  notes?: string
  promo_code?: string
  additionals: Array<{ additional_id: string; quantity: number }>
}

export interface PromoCode {
  id: string
  code: string
  description?: string | null
  discountType: 'percent' | 'amount'
  discountValue: number
  applicablePacks?: string[] | null
  maxUses?: number | null
  usedCount: number
  isActive: boolean
  expiresAt?: string | null
  createdAt: string
}

export interface AvailabilityMap { [date: string]: boolean }

export interface Setting { key: string; value: string }

export interface EventDate {
  id: string
  eventId: string
  date: string
  startTime: string
  endTime: string
}

export interface ChikiEvent {
  id: string
  title: string
  description: string
  address: string
  phone: string
  organizerName: string
  instagramUrl: string | null
  imageKey: string | null
  isActive: boolean
  isChikiGlam: boolean
  createdBy: string | null
  dates: EventDate[]
  createdAt: string
}

export type RegistrationStatus = 'pending' | 'confirmed'

export interface EventRegistration {
  id: string
  eventId: string
  name: string
  phone: string
  peopleCount: number
  status: RegistrationStatus
  createdAt: string
}

// ─── Cart (frontend-only) ─────────────────────────────────────────────────────
export interface CartPackInfo {
  id: string
  name: string
  shortDescription: string
  imageKey?: string | null
  minPeople: number
  maxPeople: number
}

export interface CartAdditional {
  id: string
  name: string
  price: number
  imageKey?: string | null
  quantity: number
}

// ─── Legacy (kept for compatibility) ─────────────────────────────────────────
export interface Service {
  id: string; name: string; description: string; duration: number
  price: number; category: string; imageUrl?: string
}

export interface Booking {
  id: string; userId: string; serviceId: string; service?: Service
  date: string; time: string; status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  notes?: string; createdAt: string
}

export interface CreateBookingPayload { serviceId: string; date: string; time: string; notes?: string }

export interface ApiResponse<T> { data: T; message: string; success: boolean }

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number
}
