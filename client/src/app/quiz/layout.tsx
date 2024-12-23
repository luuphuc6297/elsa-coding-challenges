'use client'

import { Layout } from '@/components/common/Layout'
import { useSocket } from '@/hooks/useSocket'
import { useEffect, useState } from 'react'
import { Alert, Snackbar } from '@mui/material'

export default function QuizLayout({ children }: { children: React.ReactNode }) {
    const socket = useSocket()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!socket) {
            console.log('Socket not initialized in layout')
            return
        }

        console.log('Setting up global socket listeners')
        
        const handleQuizError = (error: any) => {
            console.error('Quiz error:', error)
            setError(error?.message || 'An error occurred')
        }

        socket.on('QUIZ_ERROR', handleQuizError)

        return () => {
            if (socket) {
                console.log('Cleaning up global socket listeners')
                socket.off('QUIZ_ERROR', handleQuizError)
            }
        }
    }, [socket])

    return (
        <Layout>
            {children}
            {!socket && (
                <Snackbar
                    open={true}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                >
                    <Alert severity="warning">
                        Connecting to quiz server...
                    </Alert>
                </Snackbar>
            )}
            {error && (
                <Snackbar
                    open={true}
                    autoHideDuration={6000}
                    onClose={() => setError(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Snackbar>
            )}
        </Layout>
    )
}
