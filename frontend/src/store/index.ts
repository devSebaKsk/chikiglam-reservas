import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'
import authReducer  from './slices/authSlice'
import bookingReducer from './slices/bookingSlice'
import uiReducer    from './slices/uiSlice'
import cartReducer  from './slices/cartSlice'
import orderReducer from './slices/orderSlice'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'cart'],
}

const rootReducer = combineReducers({
  auth:    authReducer,
  booking: bookingReducer,
  ui:      uiReducer,
  cart:    cartReducer,
  order:   orderReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
