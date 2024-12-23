'use client'

import { Question } from '@/types'
import { Box, Typography } from '@mui/material'

interface Props {
    question: Question
    timeLeft: number
    questionNumber?: number
    totalQuestions?: number
}

export function QuestionDisplay({ question, timeLeft, questionNumber, totalQuestions }: Props) {
    return (
        <Box sx={{ mb: 4 }}>
            {questionNumber && totalQuestions && (
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Question {questionNumber}/{totalQuestions}
                </Typography>
            )}
            <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                {question.content}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1">
                    Points: {question.points}
                </Typography>
                <Typography variant="subtitle1" color={timeLeft < 5 ? 'error' : 'inherit'}>
                    Time remaining: {timeLeft}s
                </Typography>
            </Box>
        </Box>
    )
}
