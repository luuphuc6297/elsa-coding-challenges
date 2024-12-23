'use client'

import { Quiz } from '@/types'
import { Box, Button, Card, CardContent, Typography } from '@mui/material'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Props {
    quiz: Quiz
}

export function QuizCard({ quiz }: Props) {
    const router = useRouter()
    const now = new Date()
    const startTime = new Date(quiz.startTime)
    const endTime = new Date(quiz.endTime)

    const isAvailable = quiz.isActive && startTime <= now && endTime >= now

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {quiz.title}
                </Typography>
                <Typography color="text.secondary" paragraph>
                    {quiz.description}
                </Typography>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Duration: {quiz.duration} minutes</Typography>
                    <Typography variant="body2">Questions: {quiz.questions.length}</Typography>
                    <Typography variant="body2">Start: {format(startTime, 'PPp')}</Typography>
                    <Typography variant="body2">End: {format(endTime, 'PPp')}</Typography>
                    <Typography variant="body2">
                        Status: {isAvailable ? 'Available' : 'Not Available'}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={() => router.push(`/quiz/detail/${quiz.quizId}`)}
                    disabled={!isAvailable}
                >
                    {isAvailable ? 'Join Quiz' : 'Not Available'}
                </Button>
            </CardContent>
        </Card>
    )
}
