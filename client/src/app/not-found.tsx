'use client'

import { Alert, Container } from '@mui/material'

export default function NotFound() {
    return (
        <Container>
            <Alert severity="warning">
                The page you're looking for doesn't exist or has been moved.
            </Alert>
        </Container>
    )
} 