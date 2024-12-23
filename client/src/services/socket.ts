import { env } from '@/lib/env'
import { EVENTS } from '@/shared/constants'
import { io, Socket } from 'socket.io-client'

interface SocketResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

interface SessionResponse {
    session: {
        participants: Array<{
            userId: string
            isReady: boolean
        }>
    }
}

let socket: Socket

export const initSocket = () => {
    if (socket) {
        console.log('Socket already initialized')
        return socket
    }

    console.log('Initializing socket connection to:', `${env.NEXT_PUBLIC_SOCKET_URL}/quiz`)
    socket = io(`${env.NEXT_PUBLIC_SOCKET_URL}/quiz`, {
        autoConnect: true,
        withCredentials: true,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        auth: {
            token: localStorage.getItem('token'),
        },
        extraHeaders: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    })

    socket.on('connect', () => {
        console.log('Socket connected with details:', {
            id: socket.id,
            transport: socket.io.engine.transport.name,
            connected: socket.connected,
            auth: socket.auth,
            headers: socket.io.opts.extraHeaders,
        })
    })

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', {
            message: error.message,
            name: error.name,
            context: {
                url: env.NEXT_PUBLIC_SOCKET_URL,
                transport: socket.io.engine?.transport?.name,
                readyState: socket.io.engine?.readyState,
                auth: socket.auth,
                headers: socket.io.opts.extraHeaders,
            },
        })
    })

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', {
            reason,
            wasConnected: socket.connected,
            id: socket.id,
        })
    })

    socket.on('error', (error) => {
        console.error('Socket error:', {
            error,
            wasConnected: socket.connected,
            id: socket.id,
        })
    })

    socket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected:', {
            attemptNumber,
            id: socket.id,
            connected: socket.connected,
        })
    })

    socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', {
            error,
            attempts: socket.io.reconnectionAttempts,
            delay: socket.io.reconnectionDelay,
        })
    })

    socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed:', {
            attempts: socket.io.reconnectionAttempts,
            wasConnected: socket.connected,
        })
        window.alert('Connection to quiz server failed. Please refresh the page.')
    })

    // Quiz specific events
    socket.on(EVENTS.SESSION_EVENT, (event) => {
        console.log('Received SESSION_EVENT:', {
            type: event.type,
            data: event.data,
            socketId: socket.id,
        })

        // Re-emit specific events based on type
        if (event.type === EVENTS.QUESTION_STARTED) {
            socket.emit(EVENTS.QUESTION_STARTED, event.data)
        } else if (event.type === EVENTS.QUESTION_ENDED) {
            socket.emit(EVENTS.QUESTION_ENDED, event.data)
        }
    })

    socket.on(EVENTS.QUESTION_STARTED, (data) => {
        console.log('Received QUESTION_STARTED:', {
            data,
            socketId: socket.id,
        })
    })

    socket.on(EVENTS.QUESTION_ENDED, (data) => {
        console.log('Received QUESTION_ENDED:', {
            data,
            socketId: socket.id,
        })
    })

    socket.on(EVENTS.QUIZ_ERROR, (error) => {
        console.error('Quiz error:', {
            error,
            socketId: socket.id,
            wasConnected: socket.connected,
        })
    })

    return socket
}

export const getSocket = () => {
    if (!socket) {
        return initSocket()
    }
    return socket
}

export const connectSocket = () => {
    const socket = getSocket()
    if (!socket.connected) {
        console.log('Connecting socket:', {
            id: socket.id,
            wasConnected: socket.connected,
        })
        socket.connect()
    }
    return socket
}

export const disconnectSocket = () => {
    if (socket) {
        console.log('Disconnecting socket:', {
            id: socket.id,
            wasConnected: socket.connected,
        })
        socket.disconnect()
    }
}

export const emitEvent = <T = unknown, R = unknown>(
    eventName: string,
    data: T,
    callback?: (response: SocketResponse<R>) => void
) => {
    const socket = getSocket()
    console.log('Attempting to emit event:', {
        eventName,
        data,
        socketExists: !!socket,
        socketConnected: socket?.connected,
        socketId: socket?.id,
        socketState: {
            connected: socket?.connected,
            disconnected: socket?.disconnected,
        },
    })

    if (socket && socket.connected) {
        console.log(`Emitting ${eventName}:`, {
            data,
            socketId: socket.id,
            transport: socket.io.engine.transport.name,
            readyState: socket.io.engine.readyState,
            auth: socket.auth,
            headers: socket.io.opts.extraHeaders,
        })
        socket.emit(eventName, data, callback)
    } else {
        console.error(`Cannot emit ${eventName}: socket not connected`, {
            socketExists: !!socket,
            connected: socket?.connected,
            disconnected: socket?.disconnected,
            connecting: socket?.io?.engine?.transport?.name,
            socketId: socket?.id,
            transport: socket?.io?.engine?.transport?.name,
            readyState: socket?.io?.engine?.readyState,
        })
    }
}

export const joinQuiz = (quizId: string, userId: string, username: string) => {
    emitEvent(EVENTS.JOIN_QUIZ, { quizId, userId, username })
}

export const leaveQuiz = (quizId: string) => {
    emitEvent(EVENTS.LEAVE_QUIZ, { quizId })
}

export const participantReady = (quizId: string, userId: string) => {
    console.log('Emitting participantReady event:', { quizId, userId })
    emitEvent(EVENTS.PARTICIPANT_READY, { quizId, userId }, (response: any) => {
        console.log('participantReady response:', response)

        startSession(quizId, userId)
    })
}

export const startSession = (quizId: string, userId: string) => {
    if (!quizId || !userId) {
        console.error('Invalid parameters for START_SESSION:', { quizId, userId })
        return
    }

    console.log('Calling startSession:', {
        quizId,
        userId,
        socket: getSocket(),
        socketConnected: getSocket()?.connected,
        event: EVENTS.START_SESSION,
    })

    emitEvent(EVENTS.START_SESSION, { quizId, userId }, (response: any) => {
        console.log('START_SESSION response:', {
            response,
            success: response?.success,
            error: response?.error,
            session: response?.data?.session,
        })

        if (response?.error) {
            console.error('START_SESSION error:', response.error)
        }
    })
}

export const submitAnswer = (
    quizId: string,
    questionId: string,
    answer: string,
    timeSpent: number
) => {
    emitEvent(EVENTS.SUBMIT_ANSWER, { quizId, questionId, answer, timeSpent })
}
