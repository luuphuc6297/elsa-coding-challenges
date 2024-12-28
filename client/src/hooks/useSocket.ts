/**
 * Custom hook for managing socket connection
 */
import { SocketEvent, socketManager, SocketState } from '@/services/socket'
import { useAuthStore } from '@/store/useAuthStore'
import { useCallback, useEffect, useState } from 'react'

export function useSocket() {
    const [socket, setSocket] = useState<SocketState>({
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        socketId: null,
        socket: null,
    })
    const { logout, isAuthenticated } = useAuthStore()

    const handleConnect = useCallback(() => {
        setSocket((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            connectionError: null,
            socketId: socketManager.getSocketId(),
        }))
    }, [])

    const handleError = useCallback(
        (error: Error, type: 'connect' | 'general' = 'general') => {
            console.error(`Socket ${type} error:`, error.message)
            setSocket((prev) => ({
                ...prev,
                isConnected: false,
                isConnecting: false,
                connectionError: error,
                socketId: null,
            }))

            if (error.message === 'Unauthorized') {
                logout()
            }
        },
        [logout]
    )

    const handleDisconnect = useCallback(
        (reason: string) => {
            console.log('Socket disconnected:', reason)
            setSocket((prev) => ({
                ...prev,
                isConnected: false,
                socketId: null,
            }))

            if (reason === 'io server disconnect') {
                logout()
            }
        },
        [logout]
    )

    useEffect(() => {
        // Only initialize socket if authenticated
        if (!isAuthenticated) {
            return
        }

        const eventHandlers = {
            [SocketEvent.CONNECT]: handleConnect,
            [SocketEvent.CONNECT_ERROR]: (error: Error) => handleError(error, 'connect'),
            [SocketEvent.DISCONNECT]: handleDisconnect,
            [SocketEvent.ERROR]: (error: Error) => handleError(error),
        }

        const existingSocket = socketManager.getSocket()
        if (existingSocket) {
            setSocket((prev) => ({
                ...prev,
                socket: existingSocket,
                isConnected: existingSocket.connected,
                socketId: socketManager.getSocketId(),
            }))
        }

        Object.entries(eventHandlers).forEach(([event, handler]) => {
            socketManager.on(event, handler)
        })

        return () => {
            Object.entries(eventHandlers).forEach(([event, handler]) => {
                socketManager.off(event, handler)
            })
        }
    }, [handleConnect, handleError, handleDisconnect, isAuthenticated])

    return {
        ...socket,
        waitForConnection: socketManager.waitForConnection.bind(socketManager),
        on: socketManager.on.bind(socketManager),
        off: socketManager.off.bind(socketManager),
        emit: socketManager.emit.bind(socketManager),
    }
}
