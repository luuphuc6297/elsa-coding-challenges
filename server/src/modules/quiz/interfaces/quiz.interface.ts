import { Quiz } from '../entities/quiz.entity'
import { Types } from 'mongoose'

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

export interface IQuizSession {
    quizId: string
    sessionId: string
    status: QuizSessionStatus
    startTime: Date
    endTime?: Date
    currentQuestionIndex: number
    participants: IParticipant[]
    questionStartTime?: number
    submittedAnswers: Map<string, { answer: string; timeSpent: number; points: number }>
}

export interface IQuestionStartedEventData {
    question: {
        questionId: string
        content: string
        options: string[]
        timeLimit: number
        points: number
    }
    timeLimit: number
    questionIndex: number
    totalQuestions: number
    startTime: number
}

export interface Answer {
    questionId: string
    answer: string
    isCorrect: boolean
    timeSpent: number
    submittedAt: Date
}

export interface IParticipant {
    userId: Types.ObjectId
    username: string
    status: ParticipantStatus
    score: number
    correctAnswers: number
    timeSpent: number
    lastActive: number
    answers?: Answer[]
    joinedAt: Date
    hasCompleted: boolean
    isActive: boolean
    isReady: boolean
    readyAt?: Date
}

export interface ISubmitAnswerPayload {
    quizId: string
    questionId: string
    answer: string
    userId: string
    timeSpent: number
}

export interface IQuestionResult {
    isCorrect: boolean
    points: number
    correctAnswer: string
    timeSpent: number
    totalScore: number
    correctAnswers: number
}

export interface ILeaderboardEntry {
    userId: string
    username: string
    score: number
    correctAnswers: number
    timeSpent: number
    status: ParticipantStatus
}

export interface IQuestionState {
    questionId: string
    startTime: number
    endTime?: number
    timeLimit: number
    submittedAnswers: Map<
        string,
        {
            answer: string
            timeSpent: number
            points: number
        }
    >
}

export enum QuizSessionStatus {
    WAITING = 'waiting',
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    EXPIRED = 'expired',
}

export enum ParticipantStatus {
    TAKING = 'taking',
    ONLINE = 'online',
    OFFLINE = 'offline',
}
