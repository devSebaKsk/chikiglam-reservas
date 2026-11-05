import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface UIState {
  isMenuOpen: boolean
  isModalOpen: boolean
  modalContent: string | null
  toasts: Toast[]
}

const initialState: UIState = {
  isMenuOpen: false,
  isModalOpen: false,
  modalContent: null,
  toasts: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMenu(state) { state.isMenuOpen = !state.isMenuOpen },
    closeMenu(state) { state.isMenuOpen = false },
    openModal(state, action: PayloadAction<string>) {
      state.isModalOpen = true
      state.modalContent = action.payload
    },
    closeModal(state) {
      state.isModalOpen = false
      state.modalContent = null
    },
    addToast(state, action: PayloadAction<Omit<Toast, 'id'>>) {
      state.toasts.push({ ...action.payload, id: Date.now().toString() })
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter(t => t.id !== action.payload)
    },
  },
})

export const { toggleMenu, closeMenu, openModal, closeModal, addToast, removeToast } = uiSlice.actions
export default uiSlice.reducer
