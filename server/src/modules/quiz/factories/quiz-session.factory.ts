import { Types } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { QuizSession } from '../entities/quiz-session.entity'
import { ParticipantStatus, QuizSessionStatus } from '../interfaces/quiz.interface'

export interface IQuizSessionFactory {
    createSession(quizId: string, userId: Types.ObjectId, username: string): Partial<QuizSession>
}

export class DefaultQuizSessionFactory implements IQuizSessionFactory {
    createSession(quizId: string, userId: Types.ObjectId, username: string): Partial<QuizSession> {
        return {
            quizId,
            sessionId: uuidv4(),
            status: QuizSessionStatus.WAITING,
            startTime: new Date(),
            currentQuestionIndex: 0,
            participants: [
                {
                    userId,
                    username,
                    status: ParticipantStatus.ONLINE,
                    score: 0,
                    correctAnswers: 0,
                    timeSpent: 0,
                    lastActive: Date.now(),
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    isReady: false,
                    readyAt: null,
                },
            ],
            settings: {
                shuffleQuestions: false,
                shuffleOptions: false,
                showResults: true,
            },
            events: [],
        }
    }
}

export class CompetitiveQuizSessionFactory implements IQuizSessionFactory {
    createSession(quizId: string, userId: Types.ObjectId, username: string): Partial<QuizSession> {
        return {
            quizId,
            sessionId: uuidv4(),
            status: QuizSessionStatus.WAITING,
            startTime: new Date(),
            currentQuestionIndex: 0,
            participants: [
                {
                    userId,
                    username,
                    status: ParticipantStatus.ONLINE,
                    score: 0,
                    correctAnswers: 0,
                    timeSpent: 0,
                    lastActive: Date.now(),
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    isReady: false,
                    readyAt: null,
                },
            ],
            settings: {
                shuffleQuestions: true,
                shuffleOptions: true,
                showResults: false,
            },
            events: [],
        }
    }
}

export class PracticeQuizSessionFactory implements IQuizSessionFactory {
    createSession(quizId: string, userId: Types.ObjectId, username: string): Partial<QuizSession> {
        return {
            quizId,
            sessionId: uuidv4(),
            status: QuizSessionStatus.WAITING,
            startTime: new Date(),
            currentQuestionIndex: 0,
            participants: [
                {
                    userId,
                    username,
                    status: ParticipantStatus.ONLINE,
                    score: 0,
                    correctAnswers: 0,
                    timeSpent: 0,
                    lastActive: Date.now(),
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    isReady: false,
                    readyAt: null,
                },
            ],
            settings: {
                shuffleQuestions: false,
                shuffleOptions: false,
                showResults: true,
            },
            events: [],
        }
    }
}
