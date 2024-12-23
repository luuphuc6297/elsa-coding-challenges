'use client'

import { Box, Card, CardContent, Typography } from '@mui/material'

interface Score {
    userId: string
    username: string
    score: number
}

interface Props {
    scores: Score[]
    currentUser?: string
}

export function Scoreboard({ scores, currentUser }: Props) {
    const sortedScores = [...scores].sort((a, b) => b.score - a.score)

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Live Scores
                </Typography>
                <Box>
                    {sortedScores.map((score, index) => (
                        <Box
                            key={score.userId}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                py: 1,
                                bgcolor: score.userId === currentUser ? 'action.selected' : 'inherit',
                            }}
                        >
                            <Typography>
                                {index + 1}. {score.username}
                            </Typography>
                            <Typography>{score.score}</Typography>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    )
}
