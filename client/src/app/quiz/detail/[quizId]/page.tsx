'use client'

import { Loading } from '@/components/common/Loading'
import { useSocket } from '@/hooks/useSocket'
import { useUser } from '@/hooks/useUser'
import { quizAPI } from '@/services/api'
import { Alert, Box, Button, Card, CardContent, Container, Grid, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useParams, useRouter, notFound } from 'next/navigation'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function QuizDetailPage() {
    const params = useParams()
    const router = useRouter()
    const quizId = params.quizId as string
    const socket = useSocket()
    const { user } = useUser()
    const [socketInitialized, setSocketInitialized] = useState(false)

    const {
        data: quiz,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['quiz', quizId],
        queryFn: async () => {
            try {
                console.log('Fetching quiz:', quizId)
                const response = await quizAPI.getQuizById(quizId)
                console.log('Quiz response:', response)
                if (!response.success || !response.data) {
                    return null
                }
                return response.data
            } catch (error) {
                console.error('Quiz fetch error:', error)
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    return null
                }
                throw error
            }
        },
        retry: false,
        staleTime: 30000,
    })

    useEffect(() => {
        if (!socket) {
            console.log('Socket not initialized in quiz detail')
            setSocketInitialized(false)
            return
        }

        setSocketInitialized(true)
        console.log('Setting up quiz detail socket listeners')

        const handleQuizUpdate = () => {
            console.log('Received QUIZ_UPDATE event')
            refetch()
        }

        socket.on('QUIZ_UPDATE', handleQuizUpdate)

        return () => {
            if (socket) {
                console.log('Cleaning up quiz detail socket listeners')
                socket.off('QUIZ_UPDATE', handleQuizUpdate)
            }
        }
    }, [socket, refetch])

    const handleJoinQuiz = async () => {
        try {
            if (!quiz || !user || !socket) {
                console.log('Cannot join quiz: missing dependencies', {
                    hasQuiz: !!quiz,
                    hasUser: !!user,
                    hasSocket: !!socket
                })
                return
            }

            console.log('Emitting JOIN_QUIZ event:', {
                quizId,
                userId: user._id,
                username: user.username
            })

            socket.emit('JOIN_QUIZ', {
                quizId,
                userId: user._id,
                username: user.username
            })

            router.push(`/quiz/detail/${quizId}/play`)
        } catch (error) {
            console.error('Failed to join quiz:', error)
        }
    }

    const handleStartQuiz = async () => {
        try {
            if (!quiz || !user || !socket || !socketInitialized) {
                console.log('Cannot start quiz: missing dependencies')
                return
            }

            socket.emit('START_QUIZ', {
                quizId: quiz.quizId,
                userId: user._id,
            })

            router.push(`/quiz/detail/${quiz.quizId}/play`)
        } catch (error) {
            console.error('Failed to start quiz:', error)
        }
    }

    const handleEndQuiz = async () => {
        try {
            if (!quiz || !user || !socket || !socketInitialized) {
                console.log('Cannot end quiz: missing dependencies')
                return
            }

            socket.emit('END_QUIZ', {
                quizId: quiz.quizId,
                userId: user._id,
            })

            router.push(`/quiz/detail/${quiz.quizId}/results`)
        } catch (error) {
            console.error('Failed to end quiz:', error)
        }
    }

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

    if (!quiz) {
        notFound()
    }

    const now = new Date()
    const startTime = new Date(quiz.startTime)
    const endTime = new Date(quiz.endTime)
    const isAvailable = quiz.isActive && startTime <= now && endTime >= now
    const isUpcoming = quiz.isActive && startTime > now
    const isEnded = endTime < now

    console.log('isUpcoming')
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
                                        disabled={!socketInitialized}
                                    >
                                        {!socketInitialized ? 'Connecting...' : 'Start Quiz'}
                                    </Button>
                                    {/* <Button
                                        variant="contained"
                                        color="error"
                                        fullWidth
                                        size="large"
                                        onClick={handleEndQuiz}
                                        disabled={!socketInitialized || !isAvailable}
                                    >
                                        {!socketInitialized ? 'Connecting...' : 'End Quiz'}
                                    </Button> */}
                                </Box>
                            ) : (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    size="large"
                                    onClick={handleJoinQuiz}
                                    disabled={!socketInitialized || !isAvailable}
                                >
                                    {!socketInitialized
                                        ? 'Connecting...'
                                        : isAvailable
                                        ? 'Join Quiz'
                                        : isUpcoming
                                        ? 'Coming Soon'
                                        : 'Quiz Ended'}
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
