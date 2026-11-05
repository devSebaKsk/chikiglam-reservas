import api from './api'
import type { LoginPayload, RegisterPayload, RequestOtpPayload, VerifyOtpPayload, User } from '@/types'

type ApiWrap<T> = { success: boolean; data: T; message?: string }

export const authService = {
  async requestOtp(payload: RequestOtpPayload) {
    const res = await api.post<ApiWrap<{ phone: string; sent: boolean; dev_code?: string }>>('/auth/request-otp', payload)
    return res.data.data
  },
  async verifyOtp(payload: VerifyOtpPayload) {
    const res = await api.post<ApiWrap<{ user: User; token: string }>>('/auth/verify-otp', payload)
    return res.data.data
  },
  async login(payload: LoginPayload) {
    const res = await api.post<ApiWrap<{ user: User; token: string }>>('/auth/login', payload)
    return res.data.data
  },
  async register(payload: RegisterPayload) {
    const res = await api.post<ApiWrap<{ user: User; token: string }>>('/auth/register', payload)
    return res.data.data
  },
  async getProfile() {
    const res = await api.get<ApiWrap<User>>('/auth/me')
    return res.data.data
  },
  async quickRegister(payload: { name: string; phone: string }) {
    const res = await api.post<ApiWrap<{ user: User; token: string }>>('/auth/quick-register', payload)
    return res.data.data
  },
  async logout() {
    await api.post('/auth/logout')
  },
}
