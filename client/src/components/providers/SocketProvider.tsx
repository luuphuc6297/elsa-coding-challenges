'use client'

import { useSocket } from '@/hooks/useSocket'
import { AUTH_EVENTS, authEvents } from '@/lib/events'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect } from 'react'
import { socketManager } from '@/services/socket'

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketData = useSocket()
    const { isAuthenticated } = useAuthStore()

    useEffect(() => {
        if (isAuthenticated && !socketData.socket) {
            socketManager.initializeSocket()
        }

        const handleLoginSuccess = () => {
            if (!socketData.socket) {
                socketManager.initializeSocket()
            }
        }

        authEvents.on(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess)

        return () => {
            authEvents.off(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess)
        }
    }, [isAuthenticated, socketData.socket])

    return <>{children}</>
}
