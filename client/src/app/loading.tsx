import { CircularProgress, Container } from '@mui/material'

export default function Loading() {
    return (
        <Container
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}
        >
            <CircularProgress />
        </Container>
    )
} 