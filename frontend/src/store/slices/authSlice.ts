import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { authService } from '@services/authService'
import type { User, LoginPayload, RegisterPayload, RequestOtpPayload, VerifyOtpPayload } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  otpSent: boolean
  otpPhone: string | null
  devOtpCode: string | null
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  otpSent: false,
  otpPhone: null,
  devOtpCode: null,
}

export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async (payload: RequestOtpPayload, { rejectWithValue }) => {
    try { return await authService.requestOtp(payload) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al enviar código')
    }
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (payload: VerifyOtpPayload, { rejectWithValue }) => {
    try { return await authService.verifyOtp(payload) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Código inválido')
    }
  }
)

export const login = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try { return await authService.login(payload) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al iniciar sesión')
    }
  }
)

export const quickRegister = createAsyncThunk(
  'auth/quickRegister',
  async (payload: { name: string; phone: string }, { rejectWithValue }) => {
    try { return await authService.quickRegister(payload) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al registrarse')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try { return await authService.register(payload) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al registrarse')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null; state.token = null; state.error = null
      state.otpSent = false; state.otpPhone = null; state.devOtpCode = null
    },
    clearError(state) { state.error = null },
    resetOtp(state) { state.otpSent = false; state.otpPhone = null; state.devOtpCode = null },
  },
  extraReducers: (builder) => {
    const setLoading = (state: AuthState) => { state.isLoading = true; state.error = null }
    const setError   = (state: AuthState, action: { payload: unknown }) => { state.isLoading = false; state.error = action.payload as string }

    builder
      .addCase(requestOtp.pending, setLoading)
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.isLoading = false
        state.otpSent = true
        state.otpPhone = action.payload.phone
        state.devOtpCode = action.payload.dev_code ?? null
      })
      .addCase(requestOtp.rejected, setError)

      .addCase(verifyOtp.pending, setLoading)
      .addCase(verifyOtp.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.otpSent = false; state.otpPhone = null; state.devOtpCode = null
      })
      .addCase(verifyOtp.rejected, setError)

      .addCase(login.pending, setLoading)
      .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false; state.user = action.payload.user; state.token = action.payload.token
      })
      .addCase(login.rejected, setError)

      .addCase(quickRegister.pending, setLoading)
      .addCase(quickRegister.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false; state.user = action.payload.user; state.token = action.payload.token
      })
      .addCase(quickRegister.rejected, setError)

      .addCase(register.pending, setLoading)
      .addCase(register.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false; state.user = action.payload.user; state.token = action.payload.token
      })
      .addCase(register.rejected, setError)
  },
})

export const { logout, clearError, resetOtp } = authSlice.actions
export default authSlice.reducer
