'use client'

import { Loading } from '@/components/common/Loading'
import { QuizLobby } from '@/components/quiz/QuizLobby'
import { QuizPlayer } from '@/components/quiz/QuizPlayer'
import { useQuizStore } from '@/store/useQuizStore'
import { useUser } from '@/hooks/useUser'
import { quizAPI } from '@/services/api'
import { Alert, Container } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { EVENTS } from '@/shared/constants'
import { QuestionStartedEvent, SessionStartedEvent } from '@/types'

export default function QuizPlayPage() {
    const { quizId } = useParams<{ quizId: string }>()
    const router = useRouter()
    const socket = useSocket()
    const { user } = useUser()
    const [isSessionStarted, setIsSessionStarted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [questionData, setQuestionData] = useState<QuestionStartedEvent | null>(null)

    useEffect(() => {
        if (!socket) return

        const handleSessionStarted = (data: SessionStartedEvent) => {
            console.log('Received SESSION_STARTED event:', data)
            setIsSessionStarted(true)
            if (data.question && data.timeLimit && data.questionIndex) {
                setQuestionData({
                    question: data.question,
                    timeLimit: data.timeLimit,
                    questionIndex: data.questionIndex,
                    totalQuestions: data.totalQuestions,
                    startTime: data.startTime || Date.now(),
                    correctAnswer: data.correctAnswer || ''
                })
            }
        }

        const handleQuestionStarted = (data: QuestionStartedEvent) => {
            console.log('Received QUESTION_STARTED event:', data)
            setIsSessionStarted(true)
            setQuestionData(data)
        }

        socket.on(EVENTS.SESSION_STARTED, handleSessionStarted)
        socket.on(EVENTS.QUESTION_STARTED, handleQuestionStarted)

        return () => {
            socket.off(EVENTS.SESSION_STARTED, handleSessionStarted)
            socket.off(EVENTS.QUESTION_STARTED, handleQuestionStarted)
        }
    }, [socket])

    useEffect(() => {
        console.log('QuizPlayPage state:', {
            isSessionStarted,
            hasSocket: !!socket.socket,
            socketId: socket.socket?.id,
            connected: socket.socket?.connected,
            questionData,
        })
    }, [isSessionStarted, socket, questionData])

    if (!user) {
        return (
            <Container>
                <Alert severity="error">Please login to join the quiz</Alert>
            </Container>
        )
    }

    if (error) {
        return (
            <Container>
                <Alert severity="error">{error}</Alert>
            </Container>
        )
    }

    return (
        <Container>
            {isSessionStarted ? (
                <QuizPlayer
                    quizId={quizId}
                    initialQuestionData={questionData}
                    onComplete={() => {
                        router.push(`/quiz/detail/${quizId}/results`)
                    }}
                />
            ) : (
                <QuizLobby quizId={quizId} onError={(err) => setError(err)} />
            )}
        </Container>
    )
}
