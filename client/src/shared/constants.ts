// Socket Events
export const EVENTS = {
    // Quiz Flow Events
    JOIN_QUIZ: 'joinQuiz',
    LEAVE_QUIZ: 'leaveQuiz',
    QUIZ_STARTED: 'quizStarted',
    QUIZ_ERROR: 'quizError',

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

    // Update Events
    SCORE_UPDATE: 'scoreUpdate',
    LEADERBOARD_UPDATE: 'leaderboardUpdate',
    SUBMIT_ANSWER: 'submitAnswer',

    // Participant Events
    PARTICIPANT_JOINED: 'participantJoined',
    PARTICIPANT_LEFT: 'participantLeft',
    PARTICIPANT_READY: 'participantReady',
}

export const QUIZ_STATUS = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
}
