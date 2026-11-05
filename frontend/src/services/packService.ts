import api from './api'
import type { Pack, PackCategory, AvailabilityMap } from '@/types'

function mapPack(raw: Record<string, unknown>): Pack {
  return {
    id: raw.id as string,
    name: raw.name as string,
    shortDescription: (raw.short_description as string) ?? '',
    fullDescription: (raw.full_description as string) ?? '',
    imageKey: raw.image_key as string | null,
    minPeople: raw.min_people as number,
    maxPeople: raw.max_people as number,
    isActive: raw.is_active === 1,
    isHidden: raw.is_hidden === 1,
    sortOrder: (raw.sort_order as number) ?? 0,
    category: (raw.category as PackCategory) ?? null,
    prices: ((raw.prices ?? []) as Record<string, unknown>[]).map(p => ({
      id: p.id as string,
      packId: p.pack_id as string,
      peopleCount: p.people_count as number,
      price: p.price as number,
    })),
    resources: ((raw.resources ?? []) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      packId: r.pack_id as string,
      resourceId: r.resource_id as string,
      resourceName: r.resource_name as string,
      resourceStock: r.resource_stock as number | null,
      quantityFixed: (r.quantity_fixed as number) ?? 0,
      quantityPerPerson: (r.quantity_per_person as number) ?? 0,
    })),
    createdAt: raw.created_at as string,
  }
}

export const packService = {
  async getAll(): Promise<Pack[]> {
    const res = await api.get<Record<string, unknown>[]>('/packs')
    return (res.data as unknown as { data: Record<string, unknown>[] }).data.map(mapPack)
  },
  async getAllAdmin(): Promise<Pack[]> {
    const res = await api.get<Record<string, unknown>[]>('/packs/admin/all')
    return (res.data as unknown as { data: Record<string, unknown>[] }).data.map(mapPack)
  },
  async getById(id: string): Promise<Pack> {
    const res = await api.get(`/packs/${id}`)
    return mapPack((res.data as { data: Record<string, unknown> }).data)
  },
  async checkAvailability(id: string, date: string): Promise<boolean> {
    const res = await api.get(`/packs/${id}/availability?date=${date}`)
    return (res.data as { data: { available: boolean } }).data.available
  },
  async getMonthAvailability(id: string, month: string): Promise<AvailabilityMap> {
    const res = await api.get(`/packs/${id}/availability?month=${month}`)
    return (res.data as { data: AvailabilityMap }).data
  },
}
