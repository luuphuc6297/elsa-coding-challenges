export class QuizError extends Error {
    constructor(
        public code: string,
        message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'QuizError'
    }
}

export class QuizSessionError extends QuizError {
    constructor(message: string, details?: any) {
        super('QUIZ_SESSION_ERROR', message, details)
        this.name = 'QuizSessionError'
    }
}

export class QuizStateError extends QuizError {
    constructor(message: string, details?: any) {
        super('QUIZ_STATE_ERROR', message, details)
        this.name = 'QuizStateError'
    }
}

export class QuizValidationError extends QuizError {
    constructor(message: string, details?: any) {
        super('QUIZ_VALIDATION_ERROR', message, details)
        this.name = 'QuizValidationError'
    }
}

export class QuizNotFoundError extends QuizError {
    constructor(quizId: string) {
        super('QUIZ_NOT_FOUND', `Quiz with ID ${quizId} not found`)
        this.name = 'QuizNotFoundError'
    }
}

export class QuestionNotFoundError extends QuizError {
    constructor(questionId: string) {
        super('QUESTION_NOT_FOUND', `Question with ID ${questionId} not found`)
        this.name = 'QuestionNotFoundError'
    }
}

export class DuplicateAnswerError extends QuizError {
    constructor(userId: string, questionId: string) {
        super(
            'DUPLICATE_ANSWER',
            `User ${userId} has already submitted an answer for question ${questionId}`,
            { userId, questionId }
        )
        this.name = 'DuplicateAnswerError'
    }
}

export class ParticipantNotFoundError extends QuizError {
    constructor(userId: string, quizId: string) {
        super('PARTICIPANT_NOT_FOUND', `User ${userId} is not a participant in quiz ${quizId}`, {
            userId,
            quizId,
        })
        this.name = 'ParticipantNotFoundError'
    }
}

export class QuizStateNotFoundError extends QuizError {
    constructor(quizId: string) {
        super('QUIZ_STATE_NOT_FOUND', `Quiz state not found for quiz ${quizId}`)
        this.name = 'QuizStateNotFoundError'
    }
}

export class InvalidQuizStateError extends QuizError {
    constructor(quizId: string, currentState: string, expectedState: string) {
        super(
            'INVALID_QUIZ_STATE',
            `Quiz ${quizId} is in ${currentState} state, expected ${expectedState}`,
            { quizId, currentState, expectedState }
        )
        this.name = 'InvalidQuizStateError'
    }
}

export class QuizAuthenticationError extends QuizError {
    constructor(message: string) {
        super('QUIZ_AUTH_ERROR', message)
        this.name = 'QuizAuthenticationError'
    }
}

export class ErrorHandler {
    static handle(error: Error): any {
        if (error instanceof QuizError) {
            return {
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                },
            }
        }

        // Handle unexpected errors
        console.error('Unexpected error:', error)
        return {
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred',
            },
        }
    }
}
