import { Box, CircularProgress, Typography } from '@mui/material'

interface Props {
    message?: string
}

export function Loading({ message = 'Loading...' }: Props) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                gap: 2,
            }}
        >
            <CircularProgress />
            {message && <Typography color="text.secondary">{message}</Typography>}
        </Box>
    )
}
