import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { CartPackInfo, CartAdditional } from '@/types'
import type { RootState } from '../index'

export const FREE_LOCALITIES = ['Neuquén', 'Cipolletti', 'Plottier']
export const PAID_LOCALITIES = ['Centenario', 'Roca', 'Allen', '5 Saltos', 'Fernández Oro']
export const LOCALITY_FEE = 35_000
export const LOCALITY_OTHER = 'otras'

export function getLocalityFee(locality: string): number {
  return PAID_LOCALITIES.includes(locality) ? LOCALITY_FEE : 0
}

export interface EventDetails {
  locality: string
  address: string
  eventType: 'nino' | 'nina' | 'mixto' | ''
  childName: string
  birthdayAge: string
  colorSuggestions: string
}

export interface AppliedPromo {
  code: string
  promoCodeId: string
  discountType: 'percent' | 'amount'
  discountValue: number
  discountAmount: number
}

interface CartState {
  pack: CartPackInfo | null
  peopleCount: number
  packPrice: number
  additionals: CartAdditional[]
  date: string | null
  eventDetails: EventDetails
  appliedPromo: AppliedPromo | null
}

const initialState: CartState = {
  pack: null,
  peopleCount: 1,
  packPrice: 0,
  additionals: [],
  date: null,
  eventDetails: { locality: '', address: '', eventType: '', childName: '', birthdayAge: '', colorSuggestions: '' },
  appliedPromo: null,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setPack(state, action: PayloadAction<{ pack: CartPackInfo; peopleCount: number; packPrice: number }>) {
      state.pack = action.payload.pack
      state.peopleCount = action.payload.peopleCount
      state.packPrice = action.payload.packPrice
      state.additionals = []
      state.date = null
      state.appliedPromo = null
    },
    setPeopleCount(state, action: PayloadAction<number>) {
      state.peopleCount = action.payload
    },
    setPackPrice(state, action: PayloadAction<number>) {
      state.packPrice = action.payload
    },
    addAdditional(state, action: PayloadAction<CartAdditional>) {
      const existing = state.additionals.find(a => a.id === action.payload.id)
      if (existing) {
        existing.quantity += 1
      } else {
        state.additionals.push({ ...action.payload, quantity: 1 })
      }
    },
    removeAdditional(state, action: PayloadAction<string>) {
      state.additionals = state.additionals.filter(a => a.id !== action.payload)
    },
    incrementAdditional(state, action: PayloadAction<string>) {
      const item = state.additionals.find(a => a.id === action.payload)
      if (item) item.quantity += 1
    },
    decrementAdditional(state, action: PayloadAction<string>) {
      const item = state.additionals.find(a => a.id === action.payload)
      if (item) {
        item.quantity -= 1
        if (item.quantity <= 0) {
          state.additionals = state.additionals.filter(a => a.id !== action.payload)
        }
      }
    },
    setDate(state, action: PayloadAction<string>) {
      state.date = action.payload
    },
    setEventDetails(state, action: PayloadAction<EventDetails>) {
      state.eventDetails = action.payload
    },
    applyPromo(state, action: PayloadAction<AppliedPromo>) {
      state.appliedPromo = action.payload
    },
    clearPromo(state) {
      state.appliedPromo = null
    },
    clearCart() {
      return initialState
    },
  },
})

export const {
  setPack, setPeopleCount, setPackPrice,
  addAdditional, removeAdditional, incrementAdditional, decrementAdditional,
  setDate, setEventDetails, applyPromo, clearPromo, clearCart,
} = cartSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCartTotal = (state: RootState): number => {
  const { packPrice, additionals, eventDetails, appliedPromo } = state.cart
  const discount = appliedPromo?.discountAmount ?? 0
  return (packPrice - discount) + additionals.reduce((sum, a) => sum + a.price * a.quantity, 0) + getLocalityFee(eventDetails.locality)
}

export const selectCartItemCount = (state: RootState): number => {
  return state.cart.additionals.reduce((sum, a) => sum + a.quantity, 0) + (state.cart.pack ? 1 : 0)
}

export const selectCartIsEmpty = (state: RootState): boolean => state.cart.pack === null

export default cartSlice.reducer
