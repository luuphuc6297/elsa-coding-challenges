/**
 * Custom hook for managing socket connection
 */
import { env } from '@/lib/env'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(null)
    const { logout } = useAuthStore()

    useEffect(() => {
        // Initialize socket and handle cleanup
        const socket = io(env.NEXT_PUBLIC_API_URL, {
            withCredentials: true,
            transports: ['websocket'],
            autoConnect: true,
        })

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id)
        })

        // Wait for socket connection
        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason)
            if (reason === 'io server disconnect') {
                logout()
            }
        })

        setSocket(socket)

        // Cleanup only when window/tab closes
        return () => {
            console.log('Cleaning up socket connection:', socket.id)
            socket.close()
        }
    }, []) // Run only once on mount

    useEffect(() => {
        if (!socket) return

        socket.on('error', (error: any) => {
            console.error('Socket error:', error)
            if (error.message === 'Unauthorized') {
                logout()
            }
        })

        return () => {
            socket.off('error')
        }
    }, [socket, logout]) // Run when socket or logout function changes

    return socket
}
