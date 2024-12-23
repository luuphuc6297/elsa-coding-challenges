'use client'

import { Box, LinearProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

interface Props {
    duration: number
    onTimeUp: () => void
}

export function Timer({ duration, onTimeUp }: Props) {
    const [timeLeft, setTimeLeft] = useState(duration)
    const progress = (timeLeft / duration) * 100

    useEffect(() => {
        if (timeLeft <= 0) {
            onTimeUp()
            return
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, onTimeUp])

    return (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Time Remaining</Typography>
                <Typography>{timeLeft} seconds</Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
        </Box>
    )
}
