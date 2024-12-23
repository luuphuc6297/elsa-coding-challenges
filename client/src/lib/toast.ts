import { toast as hotToast } from 'react-hot-toast'

interface ToastOptions {
    duration?: number
    position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right'
}

const defaultOptions: ToastOptions = {
    duration: 3000,
    position: 'top-right',
}

export const toast = {
    success: (message: string, options?: ToastOptions) => {
        return hotToast.success(message, { ...defaultOptions, ...options })
    },
    error: (message: string, options?: ToastOptions) => {
        return hotToast.error(message, { ...defaultOptions, ...options })
    },
    loading: (message: string, options?: ToastOptions) => {
        return hotToast.loading(message, { ...defaultOptions, ...options })
    },
    dismiss: (toastId?: string) => {
        if (toastId) {
            hotToast.dismiss(toastId)
        } else {
            hotToast.dismiss()
        }
    },
}
