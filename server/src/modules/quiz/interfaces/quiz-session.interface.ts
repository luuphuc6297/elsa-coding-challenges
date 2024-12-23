/**
 * Enum for quiz session status
 */
export enum QuizSessionStatus {
    WAITING = 'waiting',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

/**
 * Interface for quiz session management
 */
export interface IQuizSession {
    sessionId: string
    quizId: string
    participants: IParticipant[]
    status: QuizSessionStatus
    startTime: Date
    endTime?: Date
    currentQuestionIndex?: number
    currentQuestion?: IQuestion
}

/**
 * Interface for participant information
 * @property userId - Unique identifier of the participant
 * @property score - Current score of the participant
 * @property answers - List of answers submitted by the participant
 * @property joinedAt - Time when participant joined the session
 * @property hasCompleted - Whether participant has completed the quiz
 * @property isActive - Whether participant is currently active
 */
export interface IParticipant {
    userId: string
    score: number
    answers: IAnswer[]
    joinedAt: Date
    hasCompleted: boolean
    isActive: boolean
}

/**
 * Interface for answer submission
 * @property questionId - ID of the question being answered
 * @property answer - Selected answer by the participant
 * @property isCorrect - Whether the answer is correct
 * @property timeSpent - Time spent on answering
 * @property submittedAt - Time when answer was submitted
 */
export interface IAnswer {
    questionId: string
    answer: string
    isCorrect: boolean
    timeSpent: number
    submittedAt: Date
}

/**
 * Interface for question structure
 * @property questionId - Unique identifier of the question
 * @property content - Question text content
 * @property options - Available answer options
 * @property timeLimit - Time limit for answering
 * @property points - Points awarded for correct answer
 */
export interface IQuestion {
    questionId: string
    content: string
    options: string[]
    timeLimit: number
    points: number
}

/**
 * Enum for session event types
 */
export enum SessionEventType {
    QUESTION_STARTED = 'QUESTION_STARTED',
    QUESTION_ENDED = 'QUESTION_ENDED',
    SESSION_STARTED = 'SESSION_STARTED',
    SESSION_COMPLETED = 'SESSION_COMPLETED',
}

/**
 * Base interface for session events
 */
export interface ISessionEvent {
    type: SessionEventType
    data: ISessionEventData
}

/**
 * Union type for all possible session event data types
 */
export type ISessionEventData =
    | IQuestionStartedEventData
    | IQuestionEndedEventData
    | ISessionStartedEventData
    | ISessionCompletedEventData

/**
 * Interface for question started event data
 */
export interface IQuestionStartedEventData {
    question: IQuestion
    timeLimit: number
    questionIndex: number
    totalQuestions: number
    startTime: number
}

/**
 * Interface for leaderboard entry
 */
export interface ILeaderboardEntry {
    userId: string
    username: string
    score: number
    timeSpent: number
    correctAnswers: number
}

/**
 * Interface for question ended event data
 */
export interface IQuestionEndedEventData {
    questionId: string
    correctAnswer: string
    leaderboard: ILeaderboardEntry[]
    nextQuestionIn: number
}

/**
 * Interface for session statistics
 */
export interface ISessionStatistics {
    totalParticipants: number
    averageScore: number
    topScore: number
    duration: number
}

/**
 * Interface for session completed event data
 */
export interface ISessionCompletedEventData {
    leaderboard: ILeaderboardEntry[]
    statistics: ISessionStatistics
}

/**
 * Interface for participant status in session
 */
export interface IParticipantStatus {
    userId: string
    username: string
    isReady: boolean
}

/**
 * Interface for session started event data
 */
export interface ISessionStartedEventData {
    participants: IParticipantStatus[]
    startTime: Date
}

export interface LeaderboardEntry {
    userId: string
    score: number
    rank: number
}
