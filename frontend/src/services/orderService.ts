import api from './api'
import { store } from '@store/index'
import type { Order, OrderPayment, CreateOrderPayload } from '@/types'

function mapOrder(raw: Record<string, unknown>): Order {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    packId: raw.pack_id as string,
    packName: raw.pack_name as string | undefined,
    packImageKey: raw.pack_image_key as string | null,
    userName: raw.user_name as string | undefined,
    userPhone: raw.user_phone as string | undefined,
    peopleCount: raw.people_count as number,
    date: raw.date as string,
    status: raw.status as Order['status'],
    totalPrice: raw.total_price as number,
    notes: raw.notes as string | null,
    additionals: (raw.additionals as Record<string, unknown>[] | undefined)?.map(a => ({
      id: a.id as string,
      orderId: a.order_id as string,
      additionalId: a.additional_id as string,
      additionalName: a.additional_name as string,
      quantity: a.quantity as number,
      unitPrice: a.unit_price as number,
    })),
    uploads: (raw.uploads as Record<string, unknown>[] | undefined)?.map(u => ({
      id: u.id as string,
      orderId: u.order_id as string,
      fileKey: u.file_key as string,
      uploadedAt: u.uploaded_at as string,
    })),
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  }
}

export const orderService = {
  async getAll(): Promise<Order[]> {
    const res = await api.get('/orders')
    return ((res.data as { data: Record<string, unknown>[] }).data).map(mapOrder)
  },
  async getById(id: string): Promise<Order> {
    const res = await api.get(`/orders/${id}`)
    return mapOrder((res.data as { data: Record<string, unknown> }).data)
  },
  async create(payload: CreateOrderPayload): Promise<Order> {
    const res = await api.post('/orders', payload)
    return mapOrder((res.data as { data: Record<string, unknown> }).data)
  },
  async uploadProof(id: string, file: File): Promise<Order> {
    const form = new FormData()
    form.append('proof', file)
    await api.post(`/orders/${id}/payment-proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return this.getById(id)
  },
  async updateStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed'): Promise<void> {
    await api.patch(`/orders/${id}/status`, { status })
  },
  async updateDate(id: string, date: string): Promise<void> {
    await api.patch(`/orders/${id}/date`, { date })
  },
  async getPayments(orderId: string): Promise<OrderPayment[]> {
    const res = await api.get(`/orders/${orderId}/payments`)
    return ((res.data as { data: Record<string, unknown>[] }).data).map(r => ({
      id: r.id as string,
      orderId: r.order_id as string,
      amount: r.amount as number,
      description: r.description as string | null,
      registeredBy: r.registered_by as string,
      createdAt: r.created_at as string,
    }))
  },
  async addPayment(orderId: string, data: { amount: number; description?: string }): Promise<OrderPayment> {
    const res = await api.post(`/orders/${orderId}/payments`, data)
    const r = (res.data as { data: Record<string, unknown> }).data
    return {
      id: r.id as string,
      orderId: r.order_id as string,
      amount: r.amount as number,
      description: r.description as string | null,
      registeredBy: r.registered_by as string,
      createdAt: r.created_at as string,
    }
  },
  async removePayment(orderId: string, paymentId: string): Promise<void> {
    await api.delete(`/orders/${orderId}/payments/${paymentId}`)
  },
  async deleteOrder(id: string): Promise<void> {
    await api.delete(`/orders/${id}`)
  },
  async updateDetails(id: string, data: {
    user_name?: string
    user_phone?: string
    notes?: string | null
    locality?: string
    people_count?: number
  }): Promise<{ total_price: number }> {
    const res = await api.patch(`/orders/${id}/details`, data)
    return (res.data as { data: { total_price: number } }).data
  },
  async createAsAdmin(data: {
    user_name: string
    user_phone: string
    pack_id: string
    people_count: number
    date: string
    notes?: string
    promo_code?: string
    status: 'pending_payment' | 'confirmed'
    additionals: Array<{ additional_id: string; quantity: number }>
  }): Promise<Order> {
    const res = await api.post('/orders/admin', data)
    return mapOrder((res.data as { data: Record<string, unknown> }).data)
  },
  async openProof(id: string): Promise<void> {
    const res = await api.get(`/orders/${id}/proof-url`)
    const url = (res.data as { data: { url: string } }).data.url
    const token = store.getState().auth.token
    const fullUrl = `${window.location.origin}${url}`
    const fileRes = await fetch(fullUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!fileRes.ok) throw new Error('No encontrado')
    const blob = await fileRes.blob()
    const objectUrl = URL.createObjectURL(blob)
    window.open(objectUrl, '_blank')
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000)
  },
}
