import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Order, CreateOrderPayload } from '@/types'
import { orderService } from '@services/orderService'

interface OrderState {
  orders: Order[]
  currentOrder: Order | null
  isLoading: boolean
  error: string | null
}

const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  isLoading: false,
  error: null,
}

export const fetchMyOrders = createAsyncThunk('order/fetchAll', async (_, { rejectWithValue }) => {
  try { return await orderService.getAll() }
  catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    return rejectWithValue(err.response?.data?.message ?? 'Error al cargar reservas')
  }
})

export const fetchOrderById = createAsyncThunk('order/fetchById', async (id: string, { rejectWithValue }) => {
  try { return await orderService.getById(id) }
  catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    return rejectWithValue(err.response?.data?.message ?? 'Error al cargar reserva')
  }
})

export const createOrder = createAsyncThunk('order/create', async (payload: CreateOrderPayload, { rejectWithValue }) => {
  try { return await orderService.create(payload) }
  catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    return rejectWithValue(err.response?.data?.message ?? 'Error al crear reserva')
  }
})

export const uploadPaymentProof = createAsyncThunk(
  'order/uploadProof',
  async ({ id, file }: { id: string; file: File }, { rejectWithValue }) => {
    try { return await orderService.uploadProof(id, file) }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      return rejectWithValue(err.response?.data?.message ?? 'Error al subir comprobante')
    }
  }
)

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearCurrentOrder(state) { state.currentOrder = null },
    clearError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchMyOrders.fulfilled, (state, action: PayloadAction<Order[]>) => { state.isLoading = false; state.orders = action.payload })
      .addCase(fetchMyOrders.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })

      .addCase(fetchOrderById.pending, (state) => { state.isLoading = true })
      .addCase(fetchOrderById.fulfilled, (state, action: PayloadAction<Order>) => { state.isLoading = false; state.currentOrder = action.payload })
      .addCase(fetchOrderById.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })

      .addCase(createOrder.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(createOrder.fulfilled, (state, action: PayloadAction<Order>) => { state.isLoading = false; state.currentOrder = action.payload; state.orders.unshift(action.payload) })
      .addCase(createOrder.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })

      .addCase(uploadPaymentProof.fulfilled, (state, action: PayloadAction<Order>) => {
        state.currentOrder = action.payload
        const idx = state.orders.findIndex(o => o.id === action.payload.id)
        if (idx >= 0) state.orders[idx] = action.payload
      })
  },
})

export const { clearCurrentOrder, clearError } = orderSlice.actions
export default orderSlice.reducer
