'use client'

import { QuizList } from '@/components/quiz/QuizList'
import { Loading } from '@/components/common/Loading'
import { quizAPI } from '@/services/api'
import { Alert, Container, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'

export default function QuizListPage() {
    const { data: quizzes, isLoading, error } = useQuery({
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
                <Alert severity="error">Failed to load quizzes.</Alert>
            </Container>
        )
    }

    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                Available Quizzes
            </Typography>
            <QuizList quizzes={quizzes || []} />
        </Container>
    )
} 