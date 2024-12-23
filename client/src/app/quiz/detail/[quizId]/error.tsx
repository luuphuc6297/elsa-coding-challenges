'use client'

import { Alert, Container } from '@mui/material'

export default function QuizError({ error }: { error: Error }) {
    return (
        <Container>
            <Alert severity="error">
                {error.message || 'An error occurred while loading the quiz.'}
            </Alert>
        </Container>
    )
} 