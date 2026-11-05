import api from './api'
import type { Booking, CreateBookingPayload } from '@/types'

export const bookingService = {
  async getAll() {
    const res = await api.get<Booking[]>('/bookings')
    return res.data
  },

  async getById(id: string) {
    const res = await api.get<Booking>(`/bookings/${id}`)
    return res.data
  },

  async create(payload: CreateBookingPayload) {
    const res = await api.post<Booking>('/bookings', payload)
    return res.data
  },

  async cancel(id: string) {
    const res = await api.patch<Booking>(`/bookings/${id}/cancel`)
    return res.data
  },

  async getAvailableSlots(serviceId: string, date: string) {
    const res = await api.get<string[]>(`/bookings/available?serviceId=${serviceId}&date=${date}`)
    return res.data
  },
}
