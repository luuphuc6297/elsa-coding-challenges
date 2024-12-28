import { AUTH_EVENTS, authEvents } from '@/lib/events'
import { authAPI } from '@/services/api'
import { socketManager } from '@/services/socket'
import type { User } from '@/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getStoredToken = () => {
    if (typeof window === 'undefined') return null

    return (
        localStorage.getItem('token') ||
        document.cookie
            .split('; ')
            .find((row) => row.startsWith('token='))
            ?.split('=')[1] ||
        null
    )
}

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
        (set) => {
            // Check if token exists in localStorage or cookies
            const storedToken = getStoredToken()

            return {
                user: null,
                token: storedToken,
                isAuthenticated: !!storedToken,
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

                        console.log('user___', user)

                        if (!token) {
                            throw new Error('No token received from server')
                        }

                        if (typeof window !== 'undefined') {
                            localStorage.setItem('token', token)
                            document.cookie = `token=${token}; path=/; max-age=${
                                60 * 60 * 24 * 7
                            }; SameSite=Lax; secure`
                        }

                        set({
                            user,
                            token,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        })

                        // Emit login success event
                        authEvents.emit(AUTH_EVENTS.LOGIN_SUCCESS, { user, token })
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
                        if (typeof window !== 'undefined') {
                            localStorage.removeItem('token')
                            document.cookie =
                                'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; secure'
                        }

                        socketManager.disconnect()
                        authEvents.emit(AUTH_EVENTS.LOGOUT)

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
            }
        },
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
