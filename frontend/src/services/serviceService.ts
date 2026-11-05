import api from './api'
import type { Service } from '@/types'

export const serviceService = {
  async getAll() {
    const res = await api.get<Service[]>('/services')
    return res.data
  },

  async getById(id: string) {
    const res = await api.get<Service>(`/services/${id}`)
    return res.data
  },

  async getByCategory(category: string) {
    const res = await api.get<Service[]>(`/services?category=${category}`)
    return res.data
  },
}
