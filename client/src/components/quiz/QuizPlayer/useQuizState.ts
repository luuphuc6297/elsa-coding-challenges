/**
 * Custom hook for managing quiz state
 */
import { EVENTS } from '@/shared/constants'
import { LeaderboardEntry, Question, QuestionStartedEvent } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'

interface QuizUser {
    _id: string
    username: string
    email: string
}

interface QuizState {
    currentQuestion: Question | null
    timeRemaining: number
    totalQuestions: number
    currentQuestionIndex: number
    hasSubmitted: boolean
    leaderboard: LeaderboardEntry[]
    selectedAnswer: string | null
    correctAnswer: string | null
    totalCorrectAnswers: number
    showNextButton: boolean
}

/**
 * Hook for managing quiz state and related actions
 * @param quizId - ID of the current quiz
 * @param initialQuestionData - Initial question data if available
 * @param socket - Socket.io connection
 * @param user - Current user data
 */
export function useQuizState(
    quizId: string,
    initialQuestionData: QuestionStartedEvent | null,
    socket: Socket | null,
    user: QuizUser | null
) {
    const [quizState, setQuizState] = useState<QuizState>({
        currentQuestion: initialQuestionData?.question || null,
        timeRemaining: initialQuestionData?.timeLimit || 0,
        totalQuestions: initialQuestionData?.totalQuestions || 0,
        currentQuestionIndex: (initialQuestionData?.questionIndex || 1) - 1,
        hasSubmitted: false,
        leaderboard: [],
        selectedAnswer: null,
        correctAnswer: null,
        totalCorrectAnswers: 0,
        showNextButton: false,
    })

    const updateQuizState = useCallback((updates: Partial<QuizState>) => {
        setQuizState((prev) => {
            const newState = { ...prev, ...updates }
            console.log('Updating quiz state:', newState)
            return newState
        })
    }, [])

    const handleTimeUp = useCallback(() => {
        if (!socket || !quizState.currentQuestion) return

        console.log('Time up for question:', quizState.currentQuestion.questionId)

        if (!quizState.hasSubmitted) {
            socket.emit(EVENTS.SUBMIT_ANSWER, {
                quizId,
                questionId: quizState.currentQuestion.questionId,
                answer: null,
                timeSpent: quizState.currentQuestion.timeLimit,
                userId: user?._id,
                points: 0,
            })

            updateQuizState({
                hasSubmitted: true,
                showNextButton: true,
                selectedAnswer: null,
            })
        }

        socket.emit(EVENTS.END_QUESTION, {
            quizId,
            questionId: quizState.currentQuestion.questionId,
        })
    }, [socket, quizId, user?._id, quizState, updateQuizState])

    const handleAnswer = useCallback(
        (answer: string) => {
            if (
                !socket ||
                !quizState.currentQuestion ||
                quizState.timeRemaining === 0 ||
                quizState.hasSubmitted
            )
                return

            console.log('Submitting answer:', {
                quizId,
                questionId: quizState.currentQuestion.questionId,
                answer,
                timeSpent: quizState.currentQuestion.timeLimit - quizState.timeRemaining,
            })

            updateQuizState({
                selectedAnswer: answer,
                hasSubmitted: true,
                showNextButton: true,
            })

            socket.emit(EVENTS.SUBMIT_ANSWER, {
                quizId,
                questionId: quizState.currentQuestion.questionId,
                answer,
                timeSpent: quizState.currentQuestion.timeLimit - quizState.timeRemaining,
                userId: user?._id,
            })
        },
        [socket, quizId, user?._id, updateQuizState, quizState]
    )

    const handleNextQuestion = useCallback(() => {
        if (!socket || !quizState.currentQuestion) return

        socket.emit(EVENTS.END_QUESTION, {
            quizId,
            questionId: quizState.currentQuestion.questionId,
        })

        updateQuizState({
            currentQuestion: null,
            timeRemaining: 0,
            showNextButton: false,
            selectedAnswer: null,
            correctAnswer: null,
            hasSubmitted: false,
        })
    }, [socket, quizId, quizState.currentQuestion, updateQuizState])

    useEffect(() => {
        let timer: NodeJS.Timeout | null = null

        if (quizState.timeRemaining > 0 && quizState.currentQuestion && !quizState.hasSubmitted) {
            timer = setTimeout(() => {
                updateQuizState({ timeRemaining: quizState.timeRemaining - 1 })
            }, 1000)
        } else if (quizState.timeRemaining === 0 && quizState.currentQuestion) {
            handleTimeUp()
        }

        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [
        quizState.timeRemaining,
        quizState.currentQuestion,
        quizState.hasSubmitted,
        handleTimeUp,
        updateQuizState,
    ])

    return {
        quizState,
        updateQuizState,
        handleTimeUp,
        handleAnswer,
        handleNextQuestion,
    }
}
