'use client'

import { connectSocket, disconnectSocket } from '@/services/socket'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'

let globalSocket: Socket | null = null

export function useSocket() {
    const [socket, setSocket] = useState<Socket | null>(globalSocket)
    const { logout } = useAuthStore()

    // Khởi tạo socket và xử lý cleanup
    useEffect(() => {
        if (!globalSocket) {
            console.log('Initializing global socket')
            const newSocket = connectSocket()
            globalSocket = newSocket
            setSocket(newSocket)

            // Đợi socket kết nối
            if (!newSocket.connected) {
                newSocket.connect()
            }
        } else {
            console.log('Using existing global socket')
            setSocket(globalSocket)
        }

        // Chỉ cleanup khi window/tab đóng
        const handleBeforeUnload = () => {
            console.log('Window closing, cleaning up socket')
            if (globalSocket) {
                disconnectSocket()
                globalSocket = null
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, []) 

    useEffect(() => {
        if (!socket) {
            console.log('No socket available for auth events')
            return
        }

        console.log('Setting up auth event listeners')
        const handleError = (error: any) => {
            console.error('Socket error in hook:', error)
            if (error.message === 'Authentication failed') {
                logout()
            }
        }

        const handleConnectError = (error: any) => {
            console.error('Socket connect error in hook:', error)
            if (error.message === 'Unauthorized') {
                logout()
            }
        }

        socket.on('error', handleError)
        socket.on('connect_error', handleConnectError)

        return () => {
            console.log('Cleaning up auth event listeners')
            if (socket) {
                socket.off('error', handleError)
                socket.off('connect_error', handleConnectError)
            }
        }
    }, [socket, logout]) // Chạy lại khi socket hoặc logout function thay đổi

    return socket
}
