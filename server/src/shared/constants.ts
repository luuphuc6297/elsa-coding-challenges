export const EVENTS = {
    JOIN_QUIZ: 'JOIN_QUIZ',
    LEAVE_QUIZ: 'LEAVE_QUIZ',
    QUIZ_STARTED: 'QUIZ_STARTED',
    QUIZ_ERROR: 'QUIZ_ERROR',
    QUIZ_COMPLETED: 'QUIZ_COMPLETED',
    SESSION_EVENT: 'SESSION_EVENT',
    START_SESSION: 'START_SESSION',
    SESSION_STARTED: 'SESSION_STARTED',
    SESSION_COMPLETED: 'SESSION_COMPLETED',
    START_QUESTION: 'START_QUESTION',
    END_QUESTION: 'END_QUESTION',
    NEXT_QUESTION: 'NEXT_QUESTION',
    QUESTION_TIMEOUT: 'QUESTION_TIMEOUT',
    PARTICIPANT_READY: 'PARTICIPANT_READY',
    PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
    PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
    SUBMIT_ANSWER: 'SUBMIT_ANSWER',
    ANSWER_RESULT: 'ANSWER_RESULT',
    LEADERBOARD_UPDATE: 'LEADERBOARD_UPDATE',
    RECONNECT_SESSION: 'RECONNECT_SESSION',
} as const

export const QUIZ_CONSTANTS = {
    QUESTION_TIME_LIMIT: 30000, // 30 seconds
    BASE_POINTS: 1000,
    MIN_POINTS_RATIO: 0.2, // Minimum 20% of points for last second answers
    BONUS_THRESHOLD: 0.3, // 30% time remaining for bonus points
    BONUS_MULTIPLIER: 1.5, // 50% bonus points for quick answers
} as const