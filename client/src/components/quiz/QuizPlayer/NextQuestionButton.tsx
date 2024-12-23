/**
 * Component for the next question button
 */
import { Box, Button } from '@mui/material'

interface Props {
    onNext: () => void
    disabled: boolean
}

export function NextQuestionButton({ onNext, disabled }: Props) {
    return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button 
                variant="contained" 
                onClick={onNext}
                disabled={disabled}
            >
                Next Question
            </Button>
        </Box>
    )
} 