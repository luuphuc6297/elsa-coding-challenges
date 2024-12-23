'use client'

import { LeaderboardEntry } from '@/types'
import { Box, Button, Card, CardContent, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

interface Props {
    entries: LeaderboardEntry[]
    quizId: string
}

export function QuizResults({ entries, quizId }: Props) {
    const router = useRouter()
    const sortedEntries = [...entries].sort((a, b) => b.score - a.score)

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" gutterBottom align="center">
                    Final Results
                </Typography>

                <Box sx={{ my: 4 }}>
                    {sortedEntries.map((entry, index) => (
                        <Box
                            key={entry.userId}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 2,
                                borderBottom: index !== entries.length - 1 ? 1 : 0,
                                borderColor: 'divider'
                            }}
                        >
                            <Box>
                                <Typography variant="h6">
                                    {index + 1}. {entry.username}
                                </Typography>
                                <Typography color="text.secondary">
                                    Correct Answers: {entry.correctAnswers}
                                </Typography>
                            </Box>
                            <Typography variant="h6" color="primary">
                                {entry.score} points
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => router.push('/quiz/list')}
                    >
                        Back to Quizzes
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => router.push(`/quiz/detail/${quizId}`)}
                    >
                        Play Again
                    </Button>
                </Box>
            </CardContent>
        </Card>
    )
} 