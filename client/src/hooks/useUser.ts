import { useAuthStore } from '@/store/useAuthStore'

export const useUser = () => {
    const { user, isAuthenticated, isLoading } = useAuthStore()

    return {
        user,
        isAuthenticated,
        isLoading,
        isAdmin: user?.role === 'admin',
    }
}
