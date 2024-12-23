/**
 * Main component for quiz gameplay
 */
'use client'

import { useSocket } from '@/hooks/useSocket'
import { useUser } from '@/hooks/useUser'
import { EVENTS } from '@/shared/constants'
import { QuestionStartedEvent, ScoreUpdateEvent, SessionStartedEvent } from '@/types'
import { Box } from '@mui/material'
import { useEffect } from 'react'
import { AnswerOptions } from '../AnswerOptions'
import { QuestionDisplay } from '../QuestionDisplay'
import { Scoreboard } from '../Scoreboard'
import { NextQuestionButton } from './NextQuestionButton'
import { QuizLoading } from './QuizLoading'
import { useQuizState } from './useQuizState'

interface Props {
    quizId: string
    initialQuestionData: QuestionStartedEvent | null
    onComplete: () => void
}

export function QuizPlayer({ quizId, initialQuestionData, onComplete }: Props) {
    const socket = useSocket()
    const { user } = useUser()
    const { quizState, updateQuizState, handleTimeUp, handleAnswer, handleNextQuestion } =
        useQuizState(quizId, initialQuestionData, socket, user)

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
                showNextButton: false,
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
                    correctAnswer: data.correctAnswer || '',
                })
            } else {
                updateQuizState({
                    totalQuestions: data.totalQuestions,
                })
            }
        }

        const handleQuestionEnded = () => {
            console.log('Question ended')
            updateQuizState({
                currentQuestion: null,
                timeRemaining: 0,
                hasSubmitted: false,
            })

            socket.emit(EVENTS.START_QUESTION, {
                quizId,
                questionIndex: quizState.currentQuestionIndex + 2,
            })
        }

        const handleScoreUpdate = (data: ScoreUpdateEvent) => {
            console.log('Score update:', data)
            if (data.userId === user?._id) {
                const isCorrect = data.correctAnswer === quizState.selectedAnswer
                updateQuizState({
                    hasSubmitted: true,
                    showNextButton: true,
                    correctAnswer: data.correctAnswer,
                    totalCorrectAnswers: isCorrect
                        ? quizState.totalCorrectAnswers + 1
                        : quizState.totalCorrectAnswers,
                })
            }
            if (data.leaderboard) {
                updateQuizState({ leaderboard: data.leaderboard })
            }
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
    }, [
        socket,
        updateQuizState,
        quizState.currentQuestionIndex,
        quizState.selectedAnswer,
        quizState.totalCorrectAnswers,
        user?._id,
        quizId,
    ])

    if (!quizState.currentQuestion) {
        return (
            <QuizLoading
                currentQuestionIndex={quizState.currentQuestionIndex}
                totalQuestions={quizState.totalQuestions}
            />
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
                <NextQuestionButton
                    onNext={handleNextQuestion}
                    disabled={!quizState.hasSubmitted}
                />
            )}
            {quizState.leaderboard.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Scoreboard scores={quizState.leaderboard} currentUser={user?._id} />
                </Box>
            )}
        </Box>
    )
}
