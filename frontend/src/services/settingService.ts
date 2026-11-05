import api from './api'

export const settingService = {
  async get(key: string): Promise<string | null> {
    try {
      const res = await api.get(`/settings/${key}`)
      return (res.data as { data: { value: string } }).data.value ?? null
    } catch {
      return null
    }
  },
  async getAll(): Promise<Record<string, string>> {
    const res = await api.get('/settings')
    return (res.data as { data: Record<string, string> }).data ?? {}
  },
  async set(key: string, value: string): Promise<void> {
    await api.put(`/settings/${key}`, { value })
  },
}
