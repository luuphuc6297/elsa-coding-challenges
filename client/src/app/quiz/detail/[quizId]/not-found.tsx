'use client'

import { Alert, Container } from '@mui/material'

export default function QuizNotFound() {
    return (
        <Container>
            <Alert severity="warning">
                Quiz not found. The quiz you are looking for might have been removed or does not exist.
            </Alert>
        </Container>
    )
} 