import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { CACHE_KEYS, EVENTS, QUIZ_STATUS } from 'shared/constants'
import { RedisService } from 'shared/services/redis.service'
import { QuizSession } from '../entities/quiz-session.entity'
import { IQuizSessionService } from '../interfaces/quiz.interface'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class QuizSessionService implements IQuizSessionService {
    constructor(
        @InjectModel(QuizSession.name) private quizSessionModel: Model<QuizSession>,
        private readonly redisService: RedisService
    ) {}

    async findActiveSession(quizId: string): Promise<QuizSession> {
        return await this.quizSessionModel
            .findOne({
                quizId,
                status: { $in: [QUIZ_STATUS.WAITING, QUIZ_STATUS.ACTIVE] },
            })
            .exec()
    }

    async joinQuizSession(quizId: string, userId: string): Promise<QuizSession> {
        const session = await this.findActiveSession(quizId)

        if (session) {
            const existingParticipant = session.participants.find(
                (p) => p.userId.toString() === userId
            )

            if (!existingParticipant) {
                session.participants.push({
                    userId: new Types.ObjectId(userId),
                    isReady: false,
                    score: 0,
                    answers: [],
                    joinedAt: new Date(),
                    hasCompleted: false,
                    isActive: true,
                    readyAt: null,
                })
                await session.save()
            } else {
                existingParticipant.isReady = false
                await session.save()
            }
        }

        await this.redisService.set(
            `${CACHE_KEYS.QUIZ_SESSION}${session.sessionId}`,
            JSON.stringify(session),
            60000
        )

        return session
    }

    async setParticipantReady(quizId: string, userId: string): Promise<QuizSession> {
        console.log('Setting participant ready:', { quizId, userId })

        let session = await this.quizSessionModel.findOne({
            quizId,
            status: QUIZ_STATUS.WAITING,
        })

        if (!session) {
            console.log('No waiting session found, creating new session')
            session = new this.quizSessionModel({
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
            })

            await session.save()
            await this.redisService.set(
                `${CACHE_KEYS.QUIZ_SESSION}${session.sessionId}`,
                JSON.stringify(session),
                60000
            )

            return session
        }

        const participant = session.participants.find((p) => p.userId.toString() === userId)
        if (!participant) {
            session.participants.push({
                userId: new Types.ObjectId(userId),
                score: 0,
                answers: [],
                joinedAt: new Date(),
                hasCompleted: false,
                isActive: true,
                isReady: true,
                readyAt: new Date(),
            })
        } else {
            participant.isReady = true
            participant.readyAt = new Date()
        }

        session.events.push({
            type: EVENTS.PARTICIPANT_READY,
            timestamp: new Date(),
            data: {
                userId,
                participantCount: session.participants.length,
                readyCount: session.participants.filter((p) => p.isReady).length,
            },
        })

        await session.save()
        await this.redisService.set(
            `${CACHE_KEYS.QUIZ_SESSION}${session.sessionId}`,
            JSON.stringify(session),
            60000
        )

        return session
    }

    async startQuizSession(quizId: string, userId: string): Promise<{ session: QuizSession }> {
        const session = await this.findActiveSession(quizId)
        if (!session) {
            throw new NotFoundException('Quiz session not found')
        }

        const participant = session.participants.find((p) => p.userId.toString() === userId)
        if (!participant) {
            throw new Error('User is not a participant in this session')
        }

        session.status = QUIZ_STATUS.ACTIVE
        session.startTime = new Date()
        await session.save()

        return { session }
    }

    async submitAnswer(
        sessionId: string,
        questionId: string,
        answer: string,
        userId: string,
        timeSpent: number,
        isCorrect: boolean,
        points: number
    ): Promise<{
        isCorrect: boolean
        points: number
        totalScore: number
    }> {
        const session = await this.quizSessionModel.findOne({
            sessionId,
            status: QUIZ_STATUS.ACTIVE,
        })

        if (!session) {
            throw new NotFoundException('Active quiz session not found')
        }

        const participant = session.participants.find((p) => p.userId.toString() === userId)
        if (!participant) {
            throw new NotFoundException('Participant not found')
        }

        if (participant.answers.find((a) => a.questionId === questionId)) {
            throw new Error('Answer already submitted for this question')
        }

        participant.answers.push({
            questionId,
            answer,
            isCorrect,
            timeSpent,
            submittedAt: new Date(),
        })

        participant.score += points

        await session.save()
        await this.redisService.set(
            `${CACHE_KEYS.QUIZ_SESSION}${session.sessionId}`,
            JSON.stringify(session),
            60000
        )

        return {
            isCorrect,
            points,
            totalScore: participant.score,
        }
    }

    async endQuizSession(quizId: string): Promise<QuizSession> {
        const session = await this.quizSessionModel.findOne({
            quizId,
            status: QUIZ_STATUS.ACTIVE,
        })

        if (!session) {
            throw new NotFoundException('Active quiz session not found')
        }

        session.status = QUIZ_STATUS.COMPLETED
        session.endTime = new Date()
        session.events.push({
            type: 'SESSION_ENDED',
            timestamp: new Date(),
            data: {
                finalParticipantCount: session.participants.length,
                duration: (session.endTime.getTime() - session.startTime.getTime()) / 1000,
            },
        })

        await session.save()
        await this.redisService.del(`${CACHE_KEYS.QUIZ_SESSION}${session.sessionId}`)

        return session
    }

    async getSessionStatistics(sessionId: string): Promise<{
        totalParticipants: number
        averageScore: number
        topScore: number
        duration: number | null
        completionRate: number
    }> {
        const session = await this.quizSessionModel.findOne({ sessionId })
        if (!session) {
            throw new NotFoundException('Session not found')
        }

        const participants = session.participants
        const scores = participants.map((p) => p.score)

        return {
            totalParticipants: participants.length,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            topScore: Math.max(...scores),
            duration: session.endTime
                ? (session.endTime.getTime() - session.startTime.getTime()) / 1000
                : null,
            completionRate: participants.filter((p) => p.hasCompleted).length / participants.length,
        }
    }
}
