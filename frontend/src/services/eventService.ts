import api from './api'
import type { ChikiEvent, EventDate, EventRegistration } from '@/types'

function mapDate(raw: Record<string, unknown>): EventDate {
  return {
    id: raw.id as string,
    eventId: raw.event_id as string,
    date: raw.date as string,
    startTime: raw.start_time as string,
    endTime: raw.end_time as string,
  }
}

function mapEvent(raw: Record<string, unknown>): ChikiEvent {
  return {
    id: raw.id as string,
    title: raw.title as string,
    description: raw.description as string,
    address: raw.address as string,
    phone: raw.phone as string,
    organizerName: (raw.organizer_name as string) ?? '',
    instagramUrl: (raw.instagram_url as string | null) ?? null,
    imageKey: raw.image_key as string | null,
    isActive: Boolean(raw.is_active),
    isChikiGlam: Boolean(raw.is_chiki_glam),
    createdBy: (raw.created_by as string | null) ?? null,
    dates: ((raw.dates as Record<string, unknown>[]) ?? []).map(mapDate),
    createdAt: raw.created_at as string,
  }
}

function mapRegistration(raw: Record<string, unknown>): EventRegistration {
  return {
    id: raw.id as string,
    eventId: raw.event_id as string,
    name: raw.name as string,
    phone: raw.phone as string,
    peopleCount: raw.people_count as number,
    status: raw.status as 'pending' | 'confirmed',
    createdAt: raw.created_at as string,
  }
}

export const eventService = {
  async getAll(): Promise<ChikiEvent[]> {
    const res = await api.get('/events')
    return ((res.data as { data: Record<string, unknown>[] }).data).map(mapEvent)
  },
  async getAllAdmin(): Promise<ChikiEvent[]> {
    const res = await api.get('/events/admin/all')
    return ((res.data as { data: Record<string, unknown>[] }).data).map(mapEvent)
  },
  async getById(id: string): Promise<ChikiEvent> {
    const res = await api.get(`/events/${id}`)
    return mapEvent((res.data as { data: Record<string, unknown> }).data)
  },
  async create(payload: {
    title: string; description: string; address: string; phone: string
    organizer_name: string; instagram_url?: string | null; image_key: string | null
    is_active: number; is_chiki_glam: number
    dates: Array<{ date: string; start_time: string; end_time: string }>
  }): Promise<ChikiEvent> {
    const res = await api.post('/events', payload)
    return mapEvent((res.data as { data: Record<string, unknown> }).data)
  },
  async update(id: string, payload: Partial<{
    title: string; description: string; address: string; phone: string
    organizer_name: string; instagram_url?: string | null; image_key: string | null
    is_active: number; is_chiki_glam: number
    dates: Array<{ date: string; start_time: string; end_time: string }>
  }>): Promise<void> {
    await api.patch(`/events/${id}`, payload)
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/events/${id}`)
  },

  // ─── Registrations ──────────────────────────────────────────────────────────

  async registerPublic(eventId: string, payload: { name: string; phone: string; people_count: number }): Promise<void> {
    await api.post(`/events/${eventId}/registrations`, payload)
  },

  async getRegistrations(eventId: string): Promise<{ event: { id: string; title: string }; registrations: EventRegistration[] }> {
    const res = await api.get(`/events/${eventId}/registrations`)
    const data = (res.data as { data: { event: Record<string, unknown>; registrations: Record<string, unknown>[] } }).data
    return {
      event: { id: data.event.id as string, title: data.event.title as string },
      registrations: data.registrations.map(mapRegistration),
    }
  },

  async confirmRegistration(eventId: string, regId: string): Promise<void> {
    await api.patch(`/events/${eventId}/registrations/${regId}/confirm`, {})
  },

  async deleteRegistration(eventId: string, regId: string): Promise<void> {
    await api.delete(`/events/${eventId}/registrations/${regId}`)
  },
}
