import { useSocket } from './useSocket'
import { useState, useEffect } from 'react'
import type { QuizSession, Question } from '@/types'

export const useQuiz = (quizId: string) => {
    const socket = useSocket()
    const [session, setSession] = useState<QuizSession | null>(null)
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
    const [scores, setScores] = useState<Record<string, number>>({})

    useEffect(() => {
        if (!socket) return

        socket.on('QUIZ_STATUS', (status: QuizSession) => {
            setSession(status)
        })

        socket.on('NEW_QUESTION', (question: Question) => {
            setCurrentQuestion(question)
        })

        socket.on('SCORE_UPDATE', (data: { userId: string; score: number }) => {
            setScores((prev) => ({
                ...prev,
                [data.userId]: data.score,
            }))
        })

        return () => {
            socket.off('QUIZ_STATUS')
            socket.off('NEW_QUESTION')
            socket.off('SCORE_UPDATE')
        }
    }, [socket])

    return {
        session,
        currentQuestion,
        scores,
    }
}
