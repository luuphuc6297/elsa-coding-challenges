'use client'

import { Quiz } from '@/types'
import { Box, Card, CardContent, Grid, Typography } from '@mui/material'
import { format } from 'date-fns'
import Link from 'next/link'

interface Props {
    quizzes: Quiz[]
    title: string
    emptyMessage?: string
}

export function DashboardQuizList({ quizzes, title, emptyMessage = 'No quizzes available' }: Props) {
    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                {title}
            </Typography>

            {quizzes.length === 0 ? (
                <Typography color="text.secondary">{emptyMessage}</Typography>
            ) : (
                <Grid container spacing={3}>
                    {quizzes.map((quiz) => (
                        <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                            <Link href={`/quiz/detail/${quiz.quizId}`} style={{ textDecoration: 'none' }}>
                                <Card sx={{ height: '100%', cursor: 'pointer' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            {quiz.title}
                                        </Typography>
                                        <Typography color="text.secondary" paragraph>
                                            {quiz.description}
                                        </Typography>
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="body2">
                                                Duration: {quiz.duration} minutes
                                            </Typography>
                                            <Typography variant="body2">
                                                Questions: {quiz.questions.length}
                                            </Typography>
                                            <Typography variant="body2">
                                                Start: {format(new Date(quiz.startTime), 'PPp')}
                                            </Typography>
                                            <Typography variant="body2">
                                                End: {format(new Date(quiz.endTime), 'PPp')}
                                            </Typography>
                                            <Typography variant="body2">
                                                Participants: {quiz.maxParticipants}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Link>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    )
} 