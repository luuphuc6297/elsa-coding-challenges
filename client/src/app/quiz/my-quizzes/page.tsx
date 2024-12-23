'use client'

import { useSocket } from '@/hooks/useSocket'
import { quizAPI } from '@/services/api'
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Container,
    Grid,
    Skeleton,
    Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export default function MyQuizzesPage() {
    const router = useRouter()
    const socket = useSocket()

    const {
        data: quizzes,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['quizzes'],
        queryFn: async () => {
            try {
                console.log('Fetching quizzes...')
                const response = await quizAPI.getAllQuizzes()
                console.log('Quizzes response:', response)
                if (!response.success) {
                    throw new Error('Failed to fetch quizzes')
                }
                return response.data || []
            } catch (error) {
                console.error('Error fetching quizzes:', error)
                throw error
            }
        },
    })

    console.log('Component state:', { quizzes, isLoading, error })

    const handleJoinQuiz = async (quiz: any) => {
        if (!socket) {
            console.log('Socket not available')
            return
        }

        try {
            // Join quiz via WebSocket
            socket.emit('JOIN_QUIZ', { quizId: quiz._id })

            // Navigate to quiz page
            router.push(`/quiz/${quiz._id}`)
        } catch (error) {
            console.error('Failed to join quiz:', error)
        }
    }

    if (isLoading) {
        return (
            <Container>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Available Quizzes
                    </Typography>
                    <Typography color="text.secondary">Loading quizzes...</Typography>
                </Box>
                <Grid container spacing={3}>
                    {[1, 2, 3].map((i) => (
                        <Grid item xs={12} md={4} key={i}>
                            <Card>
                                <CardContent>
                                    <Skeleton variant="text" height={40} />
                                    <Skeleton variant="text" height={20} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        )
    }

    if (error) {
        console.error('Error in component:', error)
        return (
            <Container>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Available Quizzes
                    </Typography>
                    <Alert severity="error" sx={{ mb: 3 }}>
                        Failed to load quizzes. Please try again later.
                    </Alert>
                </Box>
            </Container>
        )
    }

    if (!quizzes || quizzes.length === 0) {
        return (
            <Container>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Available Quizzes
                    </Typography>
                    <Typography color="text.secondary">
                        No quizzes available at the moment.
                    </Typography>
                </Box>
            </Container>
        )
    }

    return (
        <Container>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Available Quizzes
                </Typography>
                <Typography color="text.secondary">
                    Join a quiz to test your knowledge and compete with others!
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {quizzes.map((quiz) => (
                    <Grid item xs={12} md={4} key={quiz._id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {quiz.title}
                                </Typography>
                                <Typography color="text.secondary" paragraph>
                                    {quiz.description}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Questions: {quiz.questions?.length || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Duration: {quiz.duration || 0} minutes
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={() => handleJoinQuiz(quiz)}
                                >
                                    Join Quiz
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    )
}
