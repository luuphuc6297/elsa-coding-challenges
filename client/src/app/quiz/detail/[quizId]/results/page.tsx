'use client'

import { Loading } from '@/components/common/Loading'
import { Leaderboard } from '@/components/quiz/Leaderboard'
import { QuizResults } from '@/components/quiz/QuizResults'
import { leaderboardAPI, quizAPI } from '@/services/api'
import { Alert, Container, Grid, Typography } from '@mui/material'
import { useQueries } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

export default function QuizResultsPage() {
    const params = useParams()
    const quizId = params.quizId as string

    const [{ data: quiz, isLoading: isLoadingQuiz }, { data: leaderboard, isLoading: isLoadingLeaderboard }] =
        useQueries({
            queries: [
                {
                    queryKey: ['quiz', quizId],
                    queryFn: async () => {
                        const response = await quizAPI.getQuizById(quizId)
                        if (!response.success) {
                            throw new Error('Failed to fetch quiz details')
                        }
                        return response.data
                    },
                },
                {
                    queryKey: ['leaderboard', quizId],
                    queryFn: async () => {
                        const response = await leaderboardAPI.getLeaderboard(quizId)
                        return response.data?.entries || []
                    },
                },
            ],
        })

    if (isLoadingQuiz || isLoadingLeaderboard) {
        return <Loading message="Loading results..." />
    }

    if (!quiz || !leaderboard) {
        return (
            <Container>
                <Alert severity="error">Failed to load results.</Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h3" component="h1" align="center" gutterBottom>
                {quiz.title} - Results
            </Typography>

            <Grid container spacing={4}>
                <Grid item xs={12}>
                    <QuizResults entries={leaderboard} quizId={quizId} />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h4" gutterBottom>
                        Leaderboard
                    </Typography>
                    <Leaderboard entries={leaderboard} />
                </Grid>
            </Grid>
        </Container>
    )
}
