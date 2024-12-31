import { Types } from 'mongoose'
import { EVENTS, QUIZ_STATUS } from 'shared/constants'
import { v4 as uuidv4 } from 'uuid'
import { QuizSession } from '../entities/quiz-session.entity'

export interface IQuizSessionFactory {
    createSession(quizId: string, userId: string): QuizSession
}

export class DefaultQuizSessionFactory implements IQuizSessionFactory {
    createSession(quizId: string, userId: string): QuizSession {
        return {
            quizId,
            sessionId: uuidv4(),
            participants: [
                {
                    userId: new Types.ObjectId(userId),
                    score: 0,
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    isReady: true,
                    readyAt: new Date(),
                },
            ],
            status: QUIZ_STATUS.WAITING,
            startTime: new Date(),
            settings: {
                shuffleQuestions: true,
                shuffleOptions: true,
                showResults: true,
            },
            events: [
                {
                    type: EVENTS.PARTICIPANT_READY,
                    timestamp: new Date(),
                    data: {
                        userId,
                        participantCount: 1,
                        readyCount: 1,
                    },
                },
            ],
        } as QuizSession
    }
}

export class CompetitiveQuizSessionFactory implements IQuizSessionFactory {
    createSession(quizId: string, userId: string): QuizSession {
        return {
            quizId,
            sessionId: uuidv4(),
            participants: [
                {
                    userId: new Types.ObjectId(userId),
                    score: 0,
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    isReady: true,
                    readyAt: new Date(),
                },
            ],
            status: QUIZ_STATUS.WAITING,
            startTime: new Date(),
            settings: {
                shuffleQuestions: true,
                shuffleOptions: true,
                showResults: false, // Hide results until end in competitive mode
            },
            events: [
                {
                    type: EVENTS.PARTICIPANT_READY,
                    timestamp: new Date(),
                    data: {
                        userId,
                        participantCount: 1,
                        readyCount: 1,
                    },
                },
            ],
        } as QuizSession
    }
}

export class PracticeQuizSessionFactory implements IQuizSessionFactory {
    createSession(quizId: string, userId: string): QuizSession {
        return {
            quizId,
            sessionId: uuidv4(),
            participants: [
                {
                    userId: new Types.ObjectId(userId),
                    score: 0,
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    isReady: true,
                    readyAt: new Date(),
                },
            ],
            status: QUIZ_STATUS.WAITING,
            startTime: new Date(),
            settings: {
                shuffleQuestions: false,
                shuffleOptions: false,
                showResults: true,
            },
            events: [
                {
                    type: EVENTS.PARTICIPANT_READY,
                    timestamp: new Date(),
                    data: {
                        userId,
                        participantCount: 1,
                        readyCount: 1,
                    },
                },
            ],
        } as QuizSession
    }
}
