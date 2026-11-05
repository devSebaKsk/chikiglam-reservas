import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { bookingService } from '@services/bookingService'
import type { Booking, CreateBookingPayload } from '@/types'

interface BookingState {
  bookings: Booking[]
  selectedBooking: Booking | null
  isLoading: boolean
  error: string | null
}

const initialState: BookingState = {
  bookings: [],
  selectedBooking: null,
  isLoading: false,
  error: null,
}

export const fetchBookings = createAsyncThunk(
  'booking/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await bookingService.getAll()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al cargar reservas')
    }
  }
)

export const createBooking = createAsyncThunk(
  'booking/create',
  async (payload: CreateBookingPayload, { rejectWithValue }) => {
    try {
      return await bookingService.create(payload)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al crear reserva')
    }
  }
)

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedBooking(state, action: PayloadAction<Booking | null>) {
      state.selectedBooking = action.payload
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchBookings.fulfilled, (state, action: PayloadAction<Booking[]>) => {
        state.isLoading = false
        state.bookings = action.payload
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(createBooking.fulfilled, (state, action: PayloadAction<Booking>) => {
        state.bookings.push(action.payload)
      })
  },
})

export const { setSelectedBooking, clearError } = bookingSlice.actions
export default bookingSlice.reducer
