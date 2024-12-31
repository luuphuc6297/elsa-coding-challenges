'use client'

import { useSocket } from '@/hooks/useSocket'
import { useUser } from '@/hooks/useUser'
import { participantReady } from '@/services/socket'
import { EVENTS } from '@/shared/constants'
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
        if (!socket || !user) {
            console.log('Dependencies not available:', { hasSocket: !!socket, hasUser: !!user })
            return
        }

        console.log('Setting up QuizLobby socket listeners')

        const handleQuizEvent = (event: any) => {
            console.log('Quiz event received:', event)

            switch (event.type) {
                case 'PARTICIPANT_JOINED':
                    setParticipants((prev) => [...prev, event.data])
                    break

                case 'PARTICIPANT_LEFT':
                    setParticipants((prev) => prev.filter((p) => p.userId !== event.data.userId))
                    break

                case 'PARTICIPANT_READY':
                    setParticipants((prev) =>
                        prev.map((p) =>
                            p.userId === event.data.userId ? { ...p, isReady: true } : p
                        )
                    )
                    break

                case 'SESSION_STARTED':
                    setSessionStatus('active')
                    break
            }
        }

        const handleError = (error: any) => {
            console.error('Socket error:', error)
            setError(error.message)
            onError(error.message)
        }

        socket.on(EVENTS.SESSION_EVENT, handleQuizEvent)
        socket.on('error', handleError)

        // Join quiz session
        socket.emit(EVENTS.JOIN_QUIZ, {
            quizId,
            userId: user._id,
            username: user.username,
        })

        return () => {
            console.log('Cleaning up QuizLobby socket listeners')
            if (socket) {
                socket.off(EVENTS.SESSION_EVENT, handleQuizEvent)
                socket.off('error', handleError)
            }
        }
    }, [socket, user, quizId, onError])

    const handleReady = async () => {
        if (!user || !socket) {
            console.log('Cannot mark as ready: missing dependencies', {
                hasUser: !!user,
                hasSocket: !!socket,
            })
            return
        }

        setIsLoading(true)
        try {
            await participantReady(quizId, user._id)
            console.log('Participant marked as ready')
        } catch (error) {
            console.error('Error marking as ready:', error)
            setError('Failed to mark as ready')
            onError('Failed to mark as ready')
        } finally {
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
                    Quiz Lobby {isHost ? '(Host)' : '(Participant)'}
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
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleReady}
                        disabled={
                            !user ||
                            participants.find((p) => p.userId === user._id)?.isReady ||
                            isLoading
                        }
                        startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
                    >
                        {isLoading ? 'Marking as Ready...' : 'Ready'}
                    </Button>
                </Box>

                <Box sx={{ mt: 2 }}>
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
