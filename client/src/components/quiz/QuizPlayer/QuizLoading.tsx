/**
 * Component for displaying loading state between questions
 */
import { Alert, Box } from '@mui/material'

interface Props {
    currentQuestionIndex: number
    totalQuestions: number
}

export function QuizLoading({ currentQuestionIndex, totalQuestions }: Props) {
    return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info">
                {totalQuestions ? 
                    `Question ${currentQuestionIndex + 1}/${totalQuestions} starting soon...` :
                    'Waiting for quiz to start...'}
            </Alert>
        </Box>
    )
} 