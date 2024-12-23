'use client'

import { Loading } from '@/components/common/Loading'
import { DashboardQuizList } from '@/components/dashboard/DashboardQuizList'
import { quizAPI } from '@/services/api'
import { Quiz } from '@/types'
import { Alert, Container, Grid, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'

export default function DashboardPage() {
    const {
        data: quizzes,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['quizzes'],
        queryFn: async () => {
            const response = await quizAPI.getAllQuizzes()
            if (!response.success) {
                throw new Error('Failed to fetch quizzes')
            }
            return response.data
        },
    })

    if (isLoading) {
        return <Loading message="Loading quizzes..." />
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">Failed to load quizzes. Please try again later.</Alert>
            </Container>
        )
    }

    const now = new Date()

    const availableQuizzes =
        quizzes?.filter((quiz: Quiz) => {
            const startTime = new Date(quiz.startTime)
            const endTime = new Date(quiz.endTime)
            return (
                quiz.isActive && quiz.visibility === 'public' && startTime <= now && endTime >= now
            )
        }) || []

    const upcomingQuizzes =
        quizzes?.filter((quiz: Quiz) => {
            const startTime = new Date(quiz.startTime)
            return quiz.isActive && quiz.visibility === 'public' && startTime > now
        }) || []

    const pastQuizzes =
        quizzes?.filter((quiz: Quiz) => {
            const endTime = new Date(quiz.endTime)
            return endTime < now
        }) || []

    return (
        <Container>
            <Typography variant="h4" component="h1" gutterBottom>
                Available Quizzes
            </Typography>

            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <DashboardQuizList
                        quizzes={availableQuizzes}
                        title="Available Now"
                        emptyMessage="No quizzes available at the moment"
                    />
                </Grid>
                <Grid item xs={12}>
                    <DashboardQuizList
                        quizzes={upcomingQuizzes}
                        title="Coming Soon"
                        emptyMessage="No upcoming quizzes"
                    />
                </Grid>
                <Grid item xs={12}>
                    <DashboardQuizList
                        quizzes={pastQuizzes}
                        title="Past Quizzes"
                        emptyMessage="No past quizzes"
                    />
                </Grid>
            </Grid>
        </Container>
    )
}
