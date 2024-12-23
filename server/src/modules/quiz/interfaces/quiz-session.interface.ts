export interface IQuizSession {
    sessionId: string
    quizId: string
    participants: IParticipant[]
    status: string
    startTime: Date
    endTime?: Date
    currentQuestionIndex?: number
    currentQuestion?: IQuestion
}

export interface IParticipant {
    userId: string
    score: number
    answers: IAnswer[]
    joinedAt: Date
    hasCompleted: boolean
    isActive: boolean
}

export interface IAnswer {
    questionId: string
    answer: string
    isCorrect: boolean
    timeSpent: number
    submittedAt: Date
}

export interface IQuestion {
    questionId: string
    content: string
    options: string[]
    timeLimit: number
    points: number
}

export interface ISessionEvent {
    type: string
    data: any
}

export interface IQuestionStartedEvent {
    type: string
    data: {
        question: IQuestion
        timeLimit: number
        questionIndex: number
        totalQuestions: number
        startTime: number
    }
}

export interface IQuestionEndedEvent {
    type: string
    data: {
        questionId: string
        correctAnswer: string
        leaderboard: Array<{
            userId: string
            username: string
            score: number
            timeSpent: number
            correctAnswers: number
        }>
        nextQuestionIn: number
    }
}

export interface ISessionCompletedEvent {
    type: string
    data: {
        leaderboard: any[]
        statistics: {
            totalParticipants: number
            averageScore: number
            topScore: number
            duration: number
        }
    }
}

export interface ISessionStartedEvent {
    type: string
    data: {
        participants: Array<{
            userId: string
            username: string
            isReady: boolean
        }>
        startTime: Date
    }
}
