/**
 * Base response interface for API calls
 * @template T Type of the response data
 */
export interface BaseResponse<T> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

/**
 * User interface representing a user in the system
 */
export interface User {
    _id: string
    email: string
    username: string
    fullName?: string
    avatar?: string
    role: UserRole
    isVerified: boolean
    isActive: boolean
    totalScore: number
    quizzesTaken: number
    quizHistory: QuizHistory[]
    achievements: string[]
    lastLogin?: Date
}

/**
 * Enum for user roles
 */
export const enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    HOST = 'host',
}

/**
 * Interface for quiz history entries
 */
export interface QuizHistory {
    quizId: string
    score: number
    completedAt: Date
    timeSpent: number
    correctAnswers: number
    totalQuestions: number
}

/**
 * Interface for quiz questions
 */
export interface Question {
    questionId: string
    content: string
    options: string[]
    timeLimit: number
    points: number
}

/**
 * Quiz visibility options
 */
export type QuizVisibility = 'public' | 'private'

/**
 * Quiz status options
 */
export type QuizStatus = 'waiting' | 'active' | 'completed' | 'cancelled'

/**
 * Interface for quiz configuration
 */
export interface Quiz {
    _id: string
    quizId: string
    title: string
    description: string
    questions: Question[]
    isActive: boolean
    duration: number
    maxParticipants: number
    visibility: QuizVisibility
    startTime: Date
    endTime: Date
    createdAt: Date
    updatedAt: Date
    hostId: string
}

/**
 * Interface for quiz answers
 */
export interface Answer {
    questionId: string
    answer: string
    isCorrect: boolean
    timeSpent: number
    submittedAt: Date
}

/**
 * Interface for quiz participants
 */
export interface Participant {
    userId: string
    score: number
    answers: Answer[]
    joinedAt: Date
    hasCompleted: boolean
}

/**
 * Interface for session settings
 */
export interface SessionSettings {
    shuffleQuestions: boolean
    shuffleOptions: boolean
    showResults: boolean
}

/**
 * Interface for session events
 */
export interface SessionEvent {
    type: string
    timestamp: Date
    data: SessionEventData
}

/**
 * Union type for all possible session event data
 */
export type SessionEventData =
    | QuestionStartedEvent
    | SessionStartedEvent
    | ScoreUpdateEvent
    | QuestionEndedEvent
    | SessionCompletedEvent

/**
 * Interface for quiz sessions
 */
export interface QuizSession {
    sessionId: string
    quizId: string
    participants: Participant[]
    status: QuizStatus
    startTime: Date
    endTime?: Date
    settings: SessionSettings
    events: SessionEvent[]
    createdAt?: Date
    updatedAt?: Date
}

/**
 * Interface for leaderboard entries
 */
export interface LeaderboardEntry {
    userId: string
    username: string
    score: number
    correctAnswers: number
    timeSpent: number
}

/**
 * Leaderboard status options
 */
export type LeaderboardStatus = 'active' | 'archived'

/**
 * Interface for quiz leaderboards
 */
export interface Leaderboard {
    quizId: string
    sessionId: string
    entries: LeaderboardEntry[]
    lastCalculated: Date
    status: LeaderboardStatus
}

/**
 * Interface for authentication response
 */
export interface AuthResponse {
    accessToken: string
    user: {
        id: string
        email: string
        username: string
        role: UserRole
    }
}

/**
 * Interface for question started event
 */
export interface QuestionStartedEvent {
    question: Question
    timeLimit: number
    questionIndex: number
    totalQuestions: number
    startTime: number
    correctAnswer: string
}

/**
 * Interface for question ended event
 */
export interface QuestionEndedEvent {
    questionId: string
    correctAnswer: string
    leaderboard: LeaderboardEntry[]
    nextQuestionIn: number
}

/**
 * Interface for session started event
 */
export interface SessionStartedEvent {
    totalQuestions: number
    question?: Question
    timeLimit?: number
    questionIndex?: number
    startTime?: number
    correctAnswer?: string
}

/**
 * Interface for session statistics
 */
export interface SessionStatistics {
    totalParticipants: number
    averageScore: number
    topScore: number
    duration: number
}

/**
 * Interface for session completed event
 */
export interface SessionCompletedEvent {
    leaderboard: LeaderboardEntry[]
    statistics: SessionStatistics
}

/**
 * Interface for score update event
 */
export interface ScoreUpdateEvent {
    userId: string
    leaderboard?: LeaderboardEntry[]
    correctAnswer?: string
}
