export const EVENTS = {
    // Quiz Flow Events
    JOIN_QUIZ: 'joinQuiz',
    LEAVE_QUIZ: 'leaveQuiz',
    QUIZ_STARTED: 'quizStarted',
    QUIZ_ERROR: 'quizError',
    QUIZ_COMPLETED: 'quizCompleted',

    // Session Status Events
    SESSION_EVENT: 'sessionEvent',
    START_SESSION: 'startSession',
    SESSION_STARTED: 'sessionStarted',
    SESSION_COMPLETED: 'sessionCompleted',

    // Game Progress Events
    START_QUESTION: 'startQuestion',
    END_QUESTION: 'endQuestion',
    QUESTION_STARTED: 'questionStarted',
    QUESTION_ENDED: 'questionEnded',
    QUESTION_TIMEOUT: 'questionTimeout',
    NEXT_QUESTION: 'nextQuestion',

    // Update Events
    SCORE_UPDATE: 'scoreUpdate',
    LEADERBOARD_UPDATE: 'leaderboardUpdate',
    SUBMIT_ANSWER: 'submitAnswer',

    // Participant Events
    PARTICIPANT_JOINED: 'participantJoined',
    PARTICIPANT_LEFT: 'participantLeft',
    PARTICIPANT_READY: 'participantReady',

    ANSWER_RESULT: 'answer_result',
}

export const QUIZ_STATUS = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
}

export const CACHE_KEYS = {
    LEADERBOARD: 'leaderboard:',
    QUIZ_SESSION: 'quizSession:',
    TOP_PLAYERS: 'topPlayers:',
    CURRENT_QUESTION: 'currentQuestion:',
}

/**
 * Redis client injection token
 */
export const REDIS_CLIENT = 'REDIS_CLIENT'

export const QUIZ_CONSTANTS = {
    QUESTION_TIME_LIMIT: 30000, // 30 seconds
    BASE_POINTS: 1000,
    MIN_POINTS_RATIO: 0.2, // Minimum 20% of points for last second answers
    BONUS_THRESHOLD: 0.3, // 30% time remaining for bonus points
    BONUS_MULTIPLIER: 1.5, // 50% bonus points for quick answers
} as const
