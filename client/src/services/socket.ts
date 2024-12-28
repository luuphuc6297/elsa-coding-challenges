import { env } from '@/lib/env'
import { EVENTS } from '@/shared/constants'
import { io, Socket } from 'socket.io-client'

export interface SocketState {
    isConnected: boolean
    isConnecting: boolean
    connectionError: Error | null
    socketId: string | null
    socket: Socket | null
}

export type SocketEventCallback = (...args: any[]) => void

export enum SocketEvent {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    CONNECT_ERROR = 'connect_error',
    ERROR = 'error',
    RECONNECT = 'reconnect',
}

const SOCKET_CONFIG = {
    RETRY_DELAY: 3000,
    MAX_RETRIES: 3,
    CONNECTION_TIMEOUT: 5000,
} as const

class SocketManager {
    private static instance: SocketManager
    private socket: Socket | null = null
    private eventHandlers: Map<string, Set<SocketEventCallback>> = new Map()

    private constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager()
        }
        return SocketManager.instance
    }

    private getAuthToken(): string | null {
        const token = localStorage.getItem('token')
        if (token && token !== 'undefined' && token !== 'null') {
            return token
        }

        const tokenFromCookie = document.cookie
            .split(';')
            .find((row) => row.trim().startsWith('token='))
            ?.split('=')[1]
            ?.trim()

        if (tokenFromCookie && tokenFromCookie !== 'undefined' && tokenFromCookie !== 'null') {
            return tokenFromCookie
        }

        console.warn('No valid token found in localStorage or cookies')
        return null
    }

    private handleSocketEvent(event: string, ...args: any[]): void {
        const handlers = this.eventHandlers.get(event)
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(...args)
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error)
                }
            })
        }
    }

    private setupDefaultEventHandlers(): void {
        if (!this.socket) return

        this.socket.on(SocketEvent.CONNECT, () => {
            const connectionInfo = {
                id: this.socket?.id,
                transport: this.socket?.io?.engine?.transport?.name,
                connected: this.socket?.connected,
                auth: this.socket?.auth,
            }
            console.log('Socket connected with details:', connectionInfo)
            this.handleSocketEvent(SocketEvent.CONNECT, connectionInfo)
        })

        this.socket.on(SocketEvent.CONNECT_ERROR, (error) => {
            const errorInfo = {
                message: error.message,
                name: error.name,
                context: {
                    url: env.NEXT_PUBLIC_SOCKET_URL,
                    transport: this.socket?.io?.engine?.transport?.name,
                    readyState: this.socket?.io?.engine?.readyState,
                    auth: this.socket?.auth,
                },
            }
            console.error('Socket connection error:', errorInfo)
            this.handleSocketEvent(SocketEvent.CONNECT_ERROR, error, errorInfo)
        })

        this.socket.on(SocketEvent.ERROR, (error) => {
            const errorInfo = {
                error,
                wasConnected: this.socket?.connected,
                id: this.socket?.id,
            }
            console.error('Socket error:', errorInfo)
            this.handleSocketEvent(SocketEvent.ERROR, error, errorInfo)
        })

        this.socket.on(SocketEvent.RECONNECT, (attemptNumber) => {
            const token = this.getAuthToken()
            console.log('Token:', token)
            if (token && this.socket) {
                this.socket.auth = { token }
                const reconnectInfo = {
                    attemptNumber,
                    id: this.socket.id,
                    connected: this.socket.connected,
                }
                console.log('Socket reconnected:', reconnectInfo)
                this.handleSocketEvent(SocketEvent.RECONNECT, reconnectInfo)
            }
        })

        this.socket.on(SocketEvent.DISCONNECT, (reason) => {
            const disconnectInfo = {
                reason,
                id: this.socket?.id,
                wasConnected: this.socket?.connected,
            }
            console.log('Socket disconnected:', disconnectInfo)
            this.handleSocketEvent(SocketEvent.DISCONNECT, reason, disconnectInfo)
        })
    }

    async waitForConnection(timeout = SOCKET_CONFIG.CONNECTION_TIMEOUT): Promise<void> {
        if (this.isConnected()) return

        return new Promise((resolve, reject) => {
            const start = Date.now()
            const checkConnection = () => {
                if (this.isConnected()) {
                    resolve()
                } else if (Date.now() - start >= timeout) {
                    reject(new Error('Socket connection timeout'))
                } else {
                    setTimeout(checkConnection, 100)
                }
            }
            checkConnection()
        })
    }

    connect(): Socket {
        if (this.socket?.connected) {
            console.log('Socket already connected:', {
                id: this.socket.id,
                auth: this.socket.auth,
            })
            return this.socket
        }

        const token = this.getAuthToken()
        if (!token) {
            throw new Error('Authentication required')
        }

        this.socket = io(`${env.NEXT_PUBLIC_SOCKET_URL}/quiz`, {
            withCredentials: true,
            transports: ['websocket'],
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: SOCKET_CONFIG.RETRY_DELAY,
            reconnectionAttempts: SOCKET_CONFIG.MAX_RETRIES,
            timeout: SOCKET_CONFIG.CONNECTION_TIMEOUT,
            auth: {
                token,
            },
            extraHeaders: {
                Authorization: `Bearer ${token}`,
            },
        })

        this.socket.on(SocketEvent.CONNECT_ERROR, (error) => {
            console.error('Socket connection error:', {
                message: error.message,
                name: error.name,
                stack: error.stack,
            })
        })

        this.socket.connect()

        this.setupDefaultEventHandlers()
        return this.socket
    }

    on(event: string, callback: SocketEventCallback): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set())
        }
        this.eventHandlers.get(event)?.add(callback)

        if (!Object.values(SocketEvent).includes(event as SocketEvent)) {
            this.socket?.on(event, (...args) => this.handleSocketEvent(event, ...args))
        }
    }

    off(event: string, callback?: SocketEventCallback): void {
        if (callback) {
            this.eventHandlers.get(event)?.delete(callback)
        } else {
            this.eventHandlers.delete(event)
        }

        if (!this.eventHandlers.has(event) || this.eventHandlers.get(event)?.size === 0) {
            this.socket?.off(event)
        }
    }

    emit(event: string, data: any, callback?: Function): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected, cannot emit:', event)
            return
        }

        const emitInfo = {
            event,
            data,
            socketId: this.socket.id,
            transport: this.socket.io.engine.transport.name,
            readyState: this.socket.io.engine.readyState,
            auth: this.socket.auth,
        }
        console.log('Emitting event:', emitInfo)

        if (callback) {
            this.socket.emit(event, data, callback)
        } else {
            this.socket.emit(event, data)
        }
    }

    disconnect(): void {
        if (this.socket) {
            const disconnectInfo = {
                id: this.socket.id,
                wasConnected: this.socket.connected,
            }
            console.log('Disconnecting socket:', disconnectInfo)

            this.socket.close()
            this.socket = null
            this.eventHandlers.clear()
        }
    }

    getSocket(): Socket | null {
        return this.socket
    }

    getSocketId(): string | null {
        return this.socket?.id || null
    }

    isConnected(): boolean {
        return this.socket?.connected || false
    }

    joinQuiz(quizId: string, userId: string, username: string): void {
        this.emit(EVENTS.JOIN_QUIZ, { quizId, userId, username })
    }

    leaveQuiz(quizId: string, userId: string): void {
        this.emit(EVENTS.LEAVE_QUIZ, { quizId, userId })
    }

    participantReady(quizId: string, userId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Socket not connected'))
                return
            }

            console.log('Emitting participantReady event:', { quizId, userId })
            this.emit(EVENTS.PARTICIPANT_READY, { quizId, userId }, (response: any) => {
                if (response?.error) {
                    reject(new Error(response.error))
                } else {
                    this.startSession(quizId, userId)
                    resolve()
                }
            })
        })
    }

    startSession(quizId: string, userId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                reject(new Error('Socket not connected'))
                return
            }

            if (!quizId || !userId) {
                reject(new Error('Invalid parameters for START_SESSION'))
                return
            }

            console.log('Starting session:', { quizId, userId })
            this.emit(EVENTS.START_SESSION, { quizId, userId }, (response: any) => {
                if (response?.error) {
                    reject(new Error(response.error))
                } else {
                    resolve()
                }
            })
        })
    }

    initializeSocket(): Socket | null {
        try {
            if (!this.socket) {
                this.connect()
            }
            return this.getSocket()
        } catch (error) {
            console.error('Socket initialization failed:', error)
            return null
        }
    }
}

export const socketManager = SocketManager.getInstance()

// Export quiz specific methods for backward compatibility
export const participantReady = (quizId: string, userId: string) =>
    socketManager.participantReady(quizId, userId)

export const startSession = (quizId: string, userId: string) =>
    socketManager.startSession(quizId, userId)
