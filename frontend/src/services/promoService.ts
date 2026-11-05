import api from './api'
import type { PromoCode } from '@/types'

interface RawPromo {
  id: string
  code: string
  description?: string | null
  discount_type: 'percent' | 'amount'
  discount_value: number
  applicable_pack_ids?: string | null
  max_uses?: number | null
  used_count: number
  is_active: number
  expires_at?: string | null
  created_at: string
}

function mapPromo(r: RawPromo): PromoCode {
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discount_type,
    discountValue: r.discount_value,
    applicablePacks: r.applicable_pack_ids ? JSON.parse(r.applicable_pack_ids) : null,
    maxUses: r.max_uses,
    usedCount: r.used_count,
    isActive: Boolean(r.is_active),
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }
}

export interface ValidateResult {
  valid: boolean
  message?: string
  promoCodeId?: string
  discountType?: 'percent' | 'amount'
  discountValue?: number
}

const promoService = {
  async validate(code: string, packId: string): Promise<ValidateResult> {
    const res = await api.post('/promos/validate', { code, pack_id: packId })
    return (res.data as { data: ValidateResult }).data
  },

  async getAll(): Promise<PromoCode[]> {
    const res = await api.get('/promos')
    return ((res.data as { data: RawPromo[] }).data).map(mapPromo)
  },

  async create(data: {
    code: string
    description?: string | null
    discount_type: 'percent' | 'amount'
    discount_value: number
    applicable_pack_ids?: string[] | null
    max_uses?: number | null
    expires_at?: string | null
  }): Promise<PromoCode> {
    const res = await api.post('/promos', data)
    return mapPromo((res.data as { data: RawPromo }).data)
  },

  async update(id: string, data: Partial<{
    code: string
    description?: string | null
    discount_type: 'percent' | 'amount'
    discount_value: number
    applicable_pack_ids?: string[] | null
    max_uses?: number | null
    expires_at?: string | null
    is_active: boolean
  }>): Promise<PromoCode> {
    const res = await api.patch(`/promos/${id}`, data)
    return mapPromo((res.data as { data: RawPromo }).data)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/promos/${id}`)
  },
}

export default promoService
