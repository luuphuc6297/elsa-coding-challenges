'use client'

import { useSocket } from '@/hooks/useSocket'
import { useUser } from '@/hooks/useUser'
import { participantReady, startSession } from '@/services/socket'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

interface Participant {
    userId: string
    username: string
    isReady: boolean
}

interface Props {
    quizId: string
    onError: (error: string) => void
}

export function QuizLobby({ quizId, onError }: Props) {
    const socket = useSocket()
    const { user } = useUser()
    const [participants, setParticipants] = useState<Participant[]>([])
    const [sessionStatus, setSessionStatus] = useState<string>('waiting')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const isHost = user && participants.length > 0 && participants[0].userId === user._id

    useEffect(() => {
        if (!socket) {
            console.log('Socket not available in QuizLobby')
            return
        }

        if (!user) {
            setError('User not authenticated')
            return
        }

        console.log('Setting up QuizLobby socket listeners:', {
            socketId: socket.id,
            connected: socket.connected,
            quizId,
            userId: user._id,
        })

        const handleSessionEvent = (event: { type: string; data: any }) => {
            console.log('Received SESSION_EVENT in QuizLobby:', {
                type: event.type,
                data: event.data,
                socketId: socket.id,
                currentParticipants: participants,
            })

            switch (event.type) {
                case 'PARTICIPANT_JOINED':
                    setParticipants(event.data.participants)
                    break
                case 'PARTICIPANT_LEFT':
                    setParticipants(event.data.participants)
                    break
                case 'PARTICIPANT_READY':
                    console.log('Participant ready event received:', {
                        newParticipants: event.data.participants,
                        currentParticipants: participants,
                        readyCount: event.data.participants.filter((p: any) => p.isReady).length,
                    })
                    setParticipants(event.data.participants)
                    setIsLoading(false)
                    break
                case 'SESSION_STARTED':
                    console.log('Session started event received in lobby:', {
                        event,
                        type: event.type,
                        data: event.data,
                    })
                    setSessionStatus('active')
                    setIsLoading(false)
                    break
            }
        }

        const handleError = (error: any) => {
            console.error('Socket error in QuizLobby:', {
                error,
                socketId: socket.id,
                connected: socket.connected,
            })
            setError(error.message)
            setIsLoading(false)
        }

        socket.on('SESSION_EVENT', handleSessionEvent)
        socket.on('error', handleError)

        // Join lobby
        console.log('Joining quiz lobby:', {
            quizId,
            userId: user._id,
            username: user.username,
            socketId: socket.id,
        })
        socket.emit('JOIN_QUIZ', {
            quizId,
            userId: user._id,
            username: user.username,
        })

        return () => {
            console.log('Cleaning up QuizLobby socket listeners:', {
                socketId: socket.id,
                connected: socket.connected,
            })

            if (socket) {
                socket.off('SESSION_EVENT', handleSessionEvent)
                socket.off('error', handleError)

                if (socket.connected) {
                    console.log('Leaving quiz lobby:', {
                        quizId,
                        userId: user._id,
                        socketId: socket.id,
                    })
                    socket.emit('LEAVE_QUIZ', {
                        quizId,
                        userId: user._id,
                    })
                }
            }
        }
    }, [socket, quizId, user])

    const handleReady = async () => {
        if (!user || !socket) {
            console.log('Cannot emit ready event: missing dependencies', {
                hasUser: !!user,
                hasSocket: !!socket,
                socketId: socket?.id,
                connected: socket?.connected,
            })
            return
        }

        setIsLoading(true)
        console.log('Marking participant as ready:', {
            quizId,
            userId: user._id,
            socketId: socket.id,
            connected: socket.connected,
        })

        try {
            await participantReady(quizId, user._id)
        } catch (error) {
            console.error('Error marking participant as ready:', error)
            setError('Failed to mark as ready')
            setIsLoading(false)
        }
    }

    const handleStartSession = async () => {
        if (!user || !socket) {
            console.log('Cannot start session: missing dependencies', {
                hasUser: !!user,
                hasSocket: !!socket,
                socketId: socket?.id,
                connected: socket?.connected,
                isHost,
                sessionStatus,
                user,
            })
            return
        }

        const allParticipantsReady = participants.every((p) => p.isReady)
        if (!allParticipantsReady) {
            console.log('Cannot start session: not all participants ready', {
                readyCount: participants.filter((p) => p.isReady).length,
                totalParticipants: participants.length,
                participants: participants.map((p) => ({
                    userId: p.userId,
                    isReady: p.isReady,
                    username: p.username,
                })),
            })
            return
        }

        setIsLoading(true)
        console.log('Starting quiz session:', {
            quizId,
            userId: user._id,
            socketId: socket.id,
            connected: socket.connected,
            readyParticipants: participants.filter((p) => p.isReady).length,
            totalParticipants: participants.length,
            isHost,
            sessionStatus,
            user,
            participants: participants.map((p) => ({
                userId: p.userId,
                isReady: p.isReady,
                username: p.username,
            })),
        })

        try {
            await startSession(quizId, user._id)
        } catch (error) {
            console.error('Error starting session:', error)
            setError('Failed to start session')
            setIsLoading(false)
        }
    }

    if (error) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="error">{error}</Alert>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" gutterBottom>
                    Waiting Room {isHost ? '(Host)' : '(Participant)'}
                </Typography>

                <Box sx={{ my: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Participants ({participants.length})
                    </Typography>
                    {participants.map((participant) => (
                        <Box
                            key={participant.userId}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 1,
                                px: 2,
                                bgcolor:
                                    participant.userId === user?._id
                                        ? 'action.selected'
                                        : 'inherit',
                                borderRadius: 1,
                            }}
                        >
                            <Typography>
                                {participant.userId === user?._id ? 'You' : participant.username}
                            </Typography>
                            <Typography
                                color={participant.isReady ? 'success.main' : 'text.secondary'}
                            >
                                {participant.isReady ? 'Ready' : 'Not Ready'}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    {isHost ? (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleStartSession}
                            disabled={!participants.every((p) => p.isReady) || isLoading}
                            startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
                        >
                            {isLoading ? 'Starting...' : `Start Quiz (${participants.filter((p) => p.isReady).length}/${participants.length} ready)`}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleReady}
                            disabled={!user || participants.find((p) => p.userId === user._id)?.isReady || isLoading}
                            startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
                        >
                            {isLoading ? 'Marking as Ready...' : 'Ready'}
                        </Button>
                    )}
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Debug Info:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Session Status: {sessionStatus}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Ready Participants: {participants.filter((p) => p.isReady).length}/
                        {participants.length}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    )
}
