'use client'

import { Loading } from '@/components/common/Loading'
import { useSocket } from '@/hooks/useSocket'
import { useUser } from '@/hooks/useUser'
import { quizAPI } from '@/services/api'
import { Alert, Box, Button, Card, CardContent, Container, Grid, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { format } from 'date-fns'
import { notFound, useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'

export default function QuizDetailPage() {
    const params = useParams()
    const router = useRouter()
    const quizId = params.quizId as string
    const { socket, isConnected, isConnecting } = useSocket()
    const { user } = useUser()

    const {
        data: quiz,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['quiz', quizId],
        queryFn: async () => {
            try {
                const response = await quizAPI.getQuizById(quizId)

                if (!response.success || !response.data) {
                    return null
                }

                const quizData = response.data

                return quizData
            } catch (error) {
                console.error('[Quiz API] Fetch error:', error)
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    return null
                }
                throw error
            }
        },
        retry: false,
        staleTime: 0,
    })

    // Memoize quiz status
    const quizStatus = useMemo(() => {
        if (!quiz) return null

        const now = new Date()
        const startTime = new Date(quiz.startTime)
        const endTime = new Date(quiz.endTime)

        const isAvailable = true
        const isUpcoming = quiz.isActive && startTime > now
        // const isEnded = !quiz.isActive || endTime < now
        const isEnded = false

        return {
            isAvailable,
            isUpcoming,
            isEnded,
            startTime,
            endTime,
        }
    }, [quiz])

    useEffect(() => {
        if (!socket || !isConnected || !quizId) return

        const handleQuizUpdate = () => {
            console.log('[Socket] Received QUIZ_UPDATE event')
            refetch()
        }

        console.log('[Socket] Setting up quiz update listener')
        socket.on('QUIZ_UPDATE', handleQuizUpdate)

        return () => {
            console.log('[Socket] Cleaning up quiz update listener')
            socket.off('QUIZ_UPDATE', handleQuizUpdate)
        }
    }, [socket, isConnected, quizId, refetch])

    const handleJoinQuiz = useCallback(async () => {
        try {
            if (!quiz || !user || !socket || !isConnected) {
                console.log('[Quiz Action] Cannot join quiz:', {
                    hasQuiz: !!quiz,
                    hasUser: !!user,
                    hasSocket: !!socket,
                    isConnected,
                })
                return
            }

            socket.emit('JOIN_QUIZ', {
                quizId,
                userId: user._id,
                username: user.username,
            })

            router.push(`/quiz/detail/${quizId}/play`)
        } catch (error) {
            console.error('[Quiz Action] Failed to join quiz:', error)
        }
    }, [quiz, user, socket, isConnected, quizId, router])

    const handleStartQuiz = useCallback(async () => {
        try {
            if (!quiz || !user || !socket || !isConnected) {
                console.log('[Quiz Action] Cannot start quiz:', {
                    hasQuiz: !!quiz,
                    hasUser: !!user,
                    hasSocket: !!socket,
                    isConnected,
                })
                return
            }

            console.log('[Quiz Action] Starting quiz:', {
                quizId: quiz._id,
                userId: user._id,
            })

            socket.emit('START_QUIZ', {
                quizId: quiz._id,
                userId: user._id,
            })

            router.push(`/quiz/detail/${quiz._id}/play`)
        } catch (error) {
            console.error('[Quiz Action] Failed to start quiz:', error)
        }
    }, [quiz, user, socket, isConnected, router])

    if (isLoading) {
        return <Loading message="Loading quiz details..." />
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">Failed to load quiz details.</Alert>
            </Container>
        )
    }

    if (!quiz || !quizStatus) {
        notFound()
    }

    const { isAvailable, isUpcoming, isEnded, startTime, endTime } = quizStatus

    // Log final render state
    console.log('Quiz render state:', {
        isAvailable,
        isUpcoming,
        isEnded,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isHost: user?._id === quiz.hostId,
        socketStatus: {
            isConnected,
            isConnecting,
        },
    })

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h3" component="h1" gutterBottom>
                            {quiz.title}
                        </Typography>
                        <Typography color="text.secondary" paragraph>
                            {quiz.description}
                        </Typography>
                    </Box>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quiz Information
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Typography>Total Questions: {quiz.questions.length}</Typography>
                                <Typography>Duration: {quiz.duration} minutes</Typography>
                                <Typography>Start: {format(startTime, 'PPp')}</Typography>
                                <Typography>End: {format(endTime, 'PPp')}</Typography>
                                <Typography>
                                    Status:{' '}
                                    {isAvailable
                                        ? 'Available'
                                        : isUpcoming
                                        ? 'Coming Soon'
                                        : 'Ended'}
                                </Typography>
                                <Typography>Max Participants: {quiz.maxParticipants}</Typography>
                            </Box>
                            {user?._id === quiz.hostId ? (
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        size="large"
                                        onClick={handleStartQuiz}
                                        disabled={!isConnected || isConnecting || isEnded}
                                    >
                                        {isConnecting
                                            ? 'Connecting...'
                                            : isEnded
                                            ? 'Quiz Ended'
                                            : 'Start Quiz'}
                                    </Button>
                                </Box>
                            ) : (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    size="large"
                                    onClick={handleJoinQuiz}
                                    disabled={
                                        !isConnected || isConnecting || !isAvailable || isEnded
                                    }
                                >
                                    {isConnecting
                                        ? 'Connecting...'
                                        : isEnded
                                        ? 'Quiz Ended'
                                        : isAvailable
                                        ? 'Join Quiz'
                                        : 'Coming Soon'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Rules
                            </Typography>
                            <Typography paragraph>
                                1. Answer all questions within the time limit
                            </Typography>
                            <Typography paragraph>
                                2. Each question has only one correct answer
                            </Typography>
                            <Typography paragraph>
                                3. Points are awarded based on speed and accuracy
                            </Typography>
                            <Typography>4. Results will be shown after completion</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}
