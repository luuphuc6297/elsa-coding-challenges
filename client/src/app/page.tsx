'use client'

import { useAuthStore } from '@/store/useAuthStore'
import { Box, Button, Container, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
    const router = useRouter()
    const { isAuthenticated } = useAuthStore()

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/dashboard')
        }
    }, [isAuthenticated, router])

    return (
        <Container maxWidth="md">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 4,
                }}
            >
                <Typography variant="h2" component="h1" gutterBottom>
                    Welcome to ELSA Quiz
                </Typography>
                <Typography variant="h5" color="text.secondary" paragraph>
                    Test your English vocabulary with real-time quizzes
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => router.push('/login')}
                    >
                        Get Started
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={() => router.push('/about')}
                    >
                        Learn More
                    </Button>
                </Box>
            </Box>
        </Container>
    )
}
