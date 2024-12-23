export interface BaseResponse<T> {
    success: boolean
    data?: T
    message?: string
    error?: string
}

export interface User {
    _id: string
    email: string
    username: string
    fullName?: string
    avatar?: string
    role: string
    isVerified: boolean
    isActive: boolean
    totalScore: number
    quizzesTaken: number
    quizHistory: QuizHistory[]
    achievements: string[]
    lastLogin?: Date
}

export interface QuizHistory {
    quizId: string
    score: number
    completedAt: Date
    timeSpent: number
    correctAnswers: number
    totalQuestions: number
}

export interface Question {
    questionId: string
    content: string
    options: string[]
    timeLimit: number
    points: number
}

export interface Quiz {
    _id: string
    quizId: string
    title: string
    description: string
    questions: Question[]
    isActive: boolean
    duration: number
    maxParticipants: number
    visibility: 'public' | 'private'
    startTime: Date
    endTime: Date
    createdAt: Date
    updatedAt: Date
    hostId: string
}

export interface Answer {
    questionId: string
    answer: string
    isCorrect: boolean
    timeSpent: number
    submittedAt: Date
}

export interface Participant {
    userId: string
    score: number
    answers: Answer[]
    joinedAt: Date
    hasCompleted: boolean
}

export interface SessionSettings {
    shuffleQuestions: boolean
    shuffleOptions: boolean
    showResults: boolean
}

export interface QuizSession {
    sessionId: string
    quizId: string
    participants: Participant[]
    status: 'waiting' | 'active' | 'completed' | 'cancelled'
    startTime: Date
    endTime?: Date
    settings: SessionSettings
    events: Array<{
        type: string
        timestamp: Date
        data: any
    }>
    createdAt?: Date
    updatedAt?: Date
}

export interface LeaderboardEntry {
    userId: string
    username: string
    score: number
    correctAnswers: number
}

export interface Leaderboard {
    quizId: string
    sessionId: string
    entries: LeaderboardEntry[]
    lastCalculated: Date
    status: 'active' | 'archived'
}

export interface AuthResponse {
    access_token: string
    user: {
        id: string
        email: string
        username: string
    }
}

export interface QuestionStartedEvent {
    question: Question
    timeLimit: number
    questionIndex: number
    totalQuestions: number
    startTime: number
    correctAnswer: string
}

export interface SessionStartedEvent {
    totalQuestions: number
    question?: Question
    timeLimit?: number
    questionIndex?: number
    startTime?: number
    correctAnswer?: string
}

export interface ScoreUpdateEvent {
    userId: string
    leaderboard?: LeaderboardEntry[]
    correctAnswer?: string
} 