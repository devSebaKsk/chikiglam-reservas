import api from './api'
import type { Additional } from '@/types'

function mapAdditional(raw: Record<string, unknown>): Additional {
  let applicablePackIds: string[] | null = null
  if (raw.applicable_pack_ids) {
    try { applicablePackIds = JSON.parse(raw.applicable_pack_ids as string) } catch { applicablePackIds = null }
  }
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string | null,
    price: raw.price as number,
    imageKey: raw.image_key as string | null,
    isActive: raw.is_active === 1,
    sortOrder: (raw.sort_order as number) ?? 0,
    applicablePackIds,
  }
}

export const additionalService = {
  async getAll(): Promise<Additional[]> {
    const res = await api.get('/additionals')
    return ((res.data as { data: Record<string, unknown>[] }).data).map(mapAdditional)
  },
  async create(data: Omit<Additional, 'id' | 'isActive' | 'sortOrder'>): Promise<Additional> {
    const res = await api.post('/additionals', {
      name: data.name, description: data.description, price: data.price, image_key: data.imageKey,
      applicable_pack_ids: data.applicablePackIds ?? null,
    })
    return mapAdditional((res.data as { data: Record<string, unknown> }).data)
  },
  async update(id: string, data: Partial<Additional>): Promise<Additional> {
    const res = await api.patch(`/additionals/${id}`, {
      name: data.name, description: data.description, price: data.price,
      image_key: data.imageKey, sort_order: data.sortOrder,
      ...(data.isActive !== undefined && { is_active: data.isActive ? 1 : 0 }),
      ...(data.applicablePackIds !== undefined && { applicable_pack_ids: data.applicablePackIds }),
    })
    return mapAdditional((res.data as { data: Record<string, unknown> }).data)
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/additionals/${id}`)
  },
}
