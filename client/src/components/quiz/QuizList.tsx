import { Quiz } from '@/types'
import { Grid, Typography, Box } from '@mui/material'
import { QuizCard } from './QuizCard'

interface Props {
    quizzes: Quiz[]
    emptyMessage?: string
}

export function QuizList({ quizzes, emptyMessage = 'No quizzes available.' }: Props) {
    if (!quizzes.length) {
        return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
            </Box>
        )
    }

    return (
        <Grid container spacing={3}>
            {quizzes.map((quiz) => (
                <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                    <QuizCard quiz={quiz} />
                </Grid>
            ))}
        </Grid>
    )
}
