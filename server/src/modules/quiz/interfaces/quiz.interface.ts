import { Quiz } from '../entities/quiz.entity'
import { QuizSession } from '../entities/quiz-session.entity'
import {
    IQuizSession,
    ISessionCompletedEventData,
    IQuestionStartedEventData,
} from './quiz-session.interface'

export { IQuizSession, ISessionCompletedEventData, IQuestionStartedEventData }

export interface IQuizStartResult {
    session: IQuizSession
    question: IQuestionStartedEventData
    leaderboard: Array<{
        userId: string
        username: string
        score: number
        correctAnswers: number
        timeSpent: number
    }>
}

export interface IQuizService {
    createQuiz(createQuizDto: any): Promise<Quiz>
    findAll(): Promise<Quiz[]>
    findById(id: string): Promise<Quiz>
    updateQuiz(id: string, updateData: Partial<Quiz>): Promise<Quiz>
    deleteQuiz(id: string): Promise<void>
    addQuestion(quizId: string, question: any): Promise<Quiz>
    removeQuestion(quizId: string, questionId: string): Promise<Quiz>
    updateQuestion(quizId: string, questionId: string, updateData: any): Promise<Quiz>
}

export interface IQuestionService {
    validateAnswer(
        questionId: string,
        answer: string,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): Promise<{
        isCorrect: boolean
        points: number
    }>
}

export interface IQuizSessionService {
    findActiveSession(quizId: string): Promise<QuizSession>
    joinQuizSession(quizId: string, userId: string): Promise<QuizSession>
    setParticipantReady(quizId: string, userId: string): Promise<QuizSession>
    startQuizSession(quizId: string, userId: string): Promise<{ session: QuizSession }>
    submitAnswer(
        sessionId: string,
        questionId: string,
        answer: string,
        userId: string,
        timeSpent: number,
        isCorrect: boolean,
        points: number
    ): Promise<{
        isCorrect: boolean
        points: number
        totalScore: number
    }>
    endQuizSession(quizId: string): Promise<QuizSession>
    getSessionStatistics(sessionId: string): Promise<{
        totalParticipants: number
        averageScore: number
        topScore: number
        duration: number | null
        completionRate: number
    }>
}
