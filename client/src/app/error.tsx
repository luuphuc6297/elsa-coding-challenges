'use client'

import { Button, Container, Typography } from '@mui/material'
import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <Container
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                textAlign: 'center',
                gap: 2,
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom>
                Something went wrong!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
                {error.message || 'An unexpected error occurred'}
            </Typography>
            <Button onClick={() => reset()} variant="contained" size="large">
                Try again
            </Button>
        </Container>
    )
}
