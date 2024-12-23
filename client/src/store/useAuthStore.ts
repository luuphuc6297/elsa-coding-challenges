import { authAPI } from '@/services/api'
import { getSocket } from '@/services/socket'
import type { User } from '@/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    clearError: () => void
    updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                try {
                    set({ isLoading: true, error: null })
                    const response = await authAPI.login(email, password)

                    if (!response.success || !response.data) {
                        throw new Error(response.message || 'Login failed')
                    }

                    const { token, user } = response.data

                    // Store token in localStorage and cookie for SSR
                    localStorage.setItem('token', token)
                    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}` // 7 days

                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    })

                    // Initialize socket connection
                    getSocket()
                } catch (error) {
                    console.error('Login error:', error)
                    set({
                        error:
                            error instanceof Error
                                ? error.message
                                : 'An error occurred during login',
                        isLoading: false,
                        isAuthenticated: false,
                        user: null,
                        token: null,
                    })
                    throw error
                }
            },

            logout: async () => {
                try {
                    // Clear token from localStorage and cookie
                    localStorage.removeItem('token')
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'

                    // Disconnect socket
                    getSocket().disconnect()

                    // Clear auth state
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                    })
                } catch (error) {
                    console.error('Logout error:', error)
                }
            },

            clearError: () => set({ error: null }),

            updateUser: (user: User) => set({ user }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)
