import { useAppDispatch } from '@store/hooks'
import { addToast, removeToast } from '@store/slices/uiSlice'

export const useToast = () => {
  const dispatch = useAppDispatch()

  const toast = {
    success: (message: string) => dispatch(addToast({ message, type: 'success' })),
    error: (message: string) => dispatch(addToast({ message, type: 'error' })),
    warning: (message: string) => dispatch(addToast({ message, type: 'warning' })),
    info: (message: string) => dispatch(addToast({ message, type: 'info' })),
    dismiss: (id: string) => dispatch(removeToast(id)),
  }

  return toast
}
