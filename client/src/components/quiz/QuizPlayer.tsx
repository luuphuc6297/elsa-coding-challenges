'use client'

import { useSocket } from '@/hooks/useSocket'
import { useUser } from '@/hooks/useUser'
import { Question, QuestionStartedEvent, SessionStartedEvent, ScoreUpdateEvent, LeaderboardEntry } from '@/types'
import { Alert, Box, Button, CircularProgress } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnswerOptions } from './AnswerOptions'
import { QuestionDisplay } from './QuestionDisplay'
import { Scoreboard } from './Scoreboard'
import { EVENTS } from '@/shared/constants'

interface Props {
    quizId: string
    initialQuestionData: QuestionStartedEvent | null
    onComplete: () => void
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

export function QuizPlayer({ quizId, initialQuestionData, onComplete }: Props) {
    const socket = useSocket()
    const { user } = useUser()
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
        showNextButton: false
    })

    const updateQuizState = useCallback((updates: Partial<QuizState>) => {
        setQuizState(prev => {
            const newState = { ...prev, ...updates }
            console.log('Updating quiz state:', newState)
            return newState
        })
    }, [])

    const handleTimeUp = useCallback(() => {
        if (!socket || !quizState.currentQuestion) return

        // If answer not submitted, auto-submit null for 0 points
        if (!quizState.hasSubmitted) {
            socket.emit(EVENTS.SUBMIT_ANSWER, {
                quizId,
                questionId: quizState.currentQuestion.questionId,
                answer: null,
                timeSpent: quizState.currentQuestion.timeLimit,
                userId: user?._id,
                points: 0  // Zero points when time is up
            })

            updateQuizState({
                hasSubmitted: true,
                showNextButton: true,
                selectedAnswer: null  // No answer selected
            })
        }

        // Emit event to move to next question
        socket.emit(EVENTS.END_QUESTION, {
            quizId,
            questionId: quizState.currentQuestion.questionId
        })
    }, [socket, quizId, user?._id, quizState, updateQuizState])

    // Effect to handle initial question data
    useEffect(() => {
        if (initialQuestionData?.question) {
            console.log('Setting initial question data:', initialQuestionData)
            updateQuizState({
                currentQuestion: initialQuestionData.question,
                timeRemaining: initialQuestionData.timeLimit,
                currentQuestionIndex: initialQuestionData.questionIndex - 1,
                totalQuestions: initialQuestionData.totalQuestions,
                hasSubmitted: false,
                selectedAnswer: null,
                correctAnswer: null,
                totalCorrectAnswers: 0,
                showNextButton: false
            })
        }
    }, [initialQuestionData, updateQuizState])

    // Effect for countdown timer
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        
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
    }, [quizState.timeRemaining, quizState.currentQuestion, quizState.hasSubmitted, handleTimeUp, updateQuizState])

    const handleScoreUpdate = useCallback((data: ScoreUpdateEvent) => {
        console.log('Score update:', data)
        if (data.userId === user?._id) {
            const isCorrect = data.correctAnswer === quizState.selectedAnswer
            updateQuizState({ 
                hasSubmitted: true,
                showNextButton: true,
                correctAnswer: data.correctAnswer,
                totalCorrectAnswers: isCorrect ? quizState.totalCorrectAnswers + 1 : quizState.totalCorrectAnswers
            })
        }
        if (data.leaderboard) {
            updateQuizState({ leaderboard: data.leaderboard })
        }
    }, [user?._id, quizState.selectedAnswer, quizState.totalCorrectAnswers, updateQuizState])

    useEffect(() => {
        if (!socket) return

        const handleQuestionStarted = (data: QuestionStartedEvent) => {
            console.log('Received QUESTION_STARTED event:', data)
            updateQuizState({
                currentQuestion: data.question,
                timeRemaining: data.timeLimit,
                currentQuestionIndex: data.questionIndex - 1,
                totalQuestions: data.totalQuestions,
                hasSubmitted: false,
                selectedAnswer: null,
                correctAnswer: data.correctAnswer,
                showNextButton: false
            })
        }

        const handleSessionStarted = (data: SessionStartedEvent) => {
            console.log('Received SESSION_STARTED event:', data)
            if (data.question && data.timeLimit && data.questionIndex) {
                handleQuestionStarted({
                    question: data.question,
                    timeLimit: data.timeLimit,
                    questionIndex: data.questionIndex,
                    totalQuestions: data.totalQuestions,
                    startTime: data.startTime || Date.now(),
                    correctAnswer: data.correctAnswer || ''
                })
            } else {
                updateQuizState({
                    totalQuestions: data.totalQuestions
                })
            }
        }

        const handleQuestionEnded = () => {
            console.log('Question ended')
            updateQuizState({
                currentQuestion: null,
                timeRemaining: 0,
                hasSubmitted: false
            })

            socket.emit(EVENTS.START_QUESTION, {
                quizId,
                questionIndex: quizState.currentQuestionIndex + 2 // +2 vì currentQuestionIndex bắt đầu từ 0 và chúng ta muốn câu tiếp theo
            })
        }

        socket.on(EVENTS.SESSION_STARTED, handleSessionStarted)
        socket.on(EVENTS.QUESTION_STARTED, handleQuestionStarted)
        socket.on(EVENTS.QUESTION_ENDED, handleQuestionEnded)
        socket.on(EVENTS.SCORE_UPDATE, handleScoreUpdate)

        return () => {
            socket.off(EVENTS.SESSION_STARTED, handleSessionStarted)
            socket.off(EVENTS.QUESTION_STARTED, handleQuestionStarted)
            socket.off(EVENTS.QUESTION_ENDED, handleQuestionEnded)
            socket.off(EVENTS.SCORE_UPDATE, handleScoreUpdate)
        }
    }, [socket, updateQuizState, handleScoreUpdate])

    const handleAnswer = useCallback((answer: string) => {
        if (!socket || !quizState.currentQuestion || quizState.timeRemaining === 0 || quizState.hasSubmitted) return

        console.log('Submitting answer:', {
            quizId,
            questionId: quizState.currentQuestion.questionId,
            answer,
            timeSpent: quizState.currentQuestion.timeLimit - quizState.timeRemaining,
            questionIndex: quizState.currentQuestionIndex + 2  // +2 because currentQuestionIndex starts at 0 and we want next question
        })

        updateQuizState({
            selectedAnswer: answer,
            hasSubmitted: true,
            showNextButton: true
        })

        socket.emit(EVENTS.SUBMIT_ANSWER, {
            quizId,
            questionId: quizState.currentQuestion.questionId,
            answer,
            timeSpent: quizState.currentQuestion.timeLimit - quizState.timeRemaining,
            userId: user?._id
        })
    }, [socket, quizId, user?._id, updateQuizState, quizState])

    const handleNextQuestion = useCallback(() => {
        if (!socket || !quizState.currentQuestion) return

        // Emit event to move to next question
        socket.emit(EVENTS.END_QUESTION, {
            quizId,
            questionId: quizState.currentQuestion.questionId
        })

        // Reset state for next question
        updateQuizState({
            currentQuestion: null,
            timeRemaining: 0,
            showNextButton: false,
            selectedAnswer: null,
            correctAnswer: null,
            hasSubmitted: false
        })
    }, [socket, quizId, quizState.currentQuestion, updateQuizState])

    // Show loading while waiting for question
    if (!quizState.currentQuestion) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box>
            <QuestionDisplay 
                question={quizState.currentQuestion} 
                timeLeft={quizState.timeRemaining}
                questionNumber={quizState.currentQuestionIndex + 1}
                totalQuestions={quizState.totalQuestions}
            />
            <AnswerOptions
                options={quizState.currentQuestion.options}
                selectedAnswer={quizState.selectedAnswer}
                correctAnswer={quizState.correctAnswer}
                onSelect={handleAnswer}
                disabled={quizState.timeRemaining === 0 || quizState.hasSubmitted}
            />
            {quizState.showNextButton && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button 
                        variant="contained" 
                        onClick={handleNextQuestion}
                        disabled={!quizState.hasSubmitted}
                    >
                        Next Question
                    </Button>
                </Box>
            )}
            {quizState.leaderboard.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Scoreboard scores={quizState.leaderboard} currentUser={user?._id} />
                </Box>
            )}
        </Box>
    )
}
