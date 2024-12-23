'use client'

import { Box, Button } from '@mui/material'

interface Props {
    options: string[]
    selectedAnswer: string | null
    correctAnswer: string | null
    onSelect: (answer: string) => void
    disabled: boolean
}

export function AnswerOptions({ options, selectedAnswer, correctAnswer, onSelect, disabled }: Props) {
    const getButtonColor = (option: string) => {
        if (!selectedAnswer) return 'primary'
        if (option === correctAnswer) return 'success'
        if (option === selectedAnswer && option !== correctAnswer) return 'error'
        return 'primary'
    }

    return (
        <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 2,
            mt: 3
        }}>
            {options.map((option, index) => (
                <Button
                    key={index}
                    variant={selectedAnswer === option ? 'contained' : 'outlined'}
                    color={getButtonColor(option)}
                    onClick={() => onSelect(option)}
                    disabled={disabled}
                    sx={{ 
                        py: 2,
                        textTransform: 'none',
                        fontSize: '1rem'
                    }}
                >
                    {option}
                </Button>
            ))}
        </Box>
    )
}
