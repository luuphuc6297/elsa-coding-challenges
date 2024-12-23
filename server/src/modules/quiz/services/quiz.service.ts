import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { CACHE_KEYS, QUIZ_STATUS } from 'shared/constants'
import { RedisService } from 'shared/services/redis.service'
import { v4 as uuidv4 } from 'uuid'
import { CreateQuizDto } from '../dtos/create-quiz.dto'
import { QuizSession } from '../entities/quiz-session.entity'
import { Quiz } from '../entities/quiz.entity'

@Injectable()
export class QuizService {
    constructor(
        @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
        @InjectModel(QuizSession.name) private quizSessionModel: Model<QuizSession>,
        private readonly redisService: RedisService
    ) {}

    async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
        const quiz = new this.quizModel({
            ...createQuizDto,
            quizId: uuidv4(),
        })
        return await quiz.save()
    }

    async findAll(): Promise<Quiz[]> {
        return await this.quizModel.find().exec()
    }

    async findById(id: string): Promise<Quiz> {
        const quiz = await this.quizModel.findOne({ quizId: id }).exec()
        if (!quiz) {
            throw new NotFoundException('Quiz not found')
        }
        return quiz
    }

    private async findActiveSession(quizId: string): Promise<QuizSession> {
        return await this.quizSessionModel
            .findOne({
                quizId,
                status: { $in: [QUIZ_STATUS.WAITING, QUIZ_STATUS.ACTIVE] },
            })
            .exec()
    }

    async joinQuizSession(quizId: string, userId: string): Promise<QuizSession> {
        const session = await this.findActiveSession(quizId)

        // If session exists, update participant status
        if (session) {
            const existingParticipant = session.participants.find(
                (p) => p.userId.toString() === userId
            )

            // If participant doesn't exist, add new one
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
            }
            // If participant exists, update their status
            else {
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

    async submitAnswer(
        quizId: string,
        questionId: string,
        answer: string,
        userId: string,
        timeSpent: number
    ) {
        const session = await this.quizSessionModel.findOne({
            quizId,
            status: QUIZ_STATUS.ACTIVE,
        })

        if (!session) {
            throw new NotFoundException('Active quiz session not found')
        }

        const quiz = await this.findById(quizId)
        const question = quiz.questions.find((q) => q.questionId === questionId)

        if (!question) {
            throw new NotFoundException('Question not found')
        }

        const participant = session.participants.find((p) => p.userId.toString() === userId)

        if (!participant) {
            throw new NotFoundException('Participant not found')
        }

        // Check if answer was already submitted
        if (participant.answers.find((a) => a.questionId === questionId)) {
            throw new Error('Answer already submitted for this question')
        }

        const isCorrect = question.correctAnswer === answer
        const points = this.calculatePoints(
            isCorrect,
            timeSpent,
            question.timeLimit,
            question.points
        )

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
            correctAnswer: question.correctAnswer,
        }
    }

    private calculatePoints(
        isCorrect: boolean,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): number {
        if (!isCorrect) return 0

        // Time bonus: faster answers get more points
        const timeBonus = Math.max(0, 1 - timeSpent / timeLimit)
        return Math.round(maxPoints * (0.7 + 0.3 * timeBonus))
    }

    async startQuizSession(quizId: string, userId: string) {
        // Validate session start conditions
        const session = await this.findActiveSession(quizId)
        if (!session) {
            throw new NotFoundException('Quiz session not found')
        }

        // Validate user permission
        const participant = session.participants.find((p) => p.userId.toString() === userId)
        if (!participant) {
            throw new Error('User is not a participant in this session')
        }

        // Get quiz and questions
        const quiz = await this.findById(quizId)
        if (!quiz) {
            throw new NotFoundException('Quiz not found')
        }

        // Update session status
        session.status = 'active'
        session.startTime = new Date()
        await session.save()

        return { session }
    }

    async endQuizSession(quizId: string) {
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

    async getSessionStatistics(sessionId: string) {
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

    async getQuizSession(quizId: string) {
        const sessionKey = `${CACHE_KEYS.QUIZ_SESSION}${quizId}`
        const sessionData = await this.redisService.get(sessionKey)

        if (!sessionData) {
            return null
        }

        return JSON.parse(sessionData)
    }

    async setParticipantReady(quizId: string, userId: string) {
        console.log('Setting participant ready:', { quizId, userId })

        const quiz = await this.findById(quizId)
        let session = await this.quizSessionModel.findOne({
            quizId: quiz.quizId,
            status: QUIZ_STATUS.WAITING,
        })

        if (!session) {
            console.log('No waiting session found, creating new session')
            session = new this.quizSessionModel({
                quizId: quiz.quizId,
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
                        type: 'PARTICIPANT_READY',
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

            console.log('Created new session:', {
                sessionId: session.sessionId,
                participantsCount: 1,
                readyCount: 1,
            })

            return session
        }

        // Nếu tìm thấy session, cập nhật trạng thái participant
        const participant = session.participants.find((p) => p.userId.toString() === userId)
        if (!participant) {
            // Nếu participant chưa tồn tại, thêm mới
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
            // Nếu participant đã tồn tại, cập nhật trạng thái
            participant.isReady = true
            participant.readyAt = new Date()
        }

        session.events.push({
            type: 'PARTICIPANT_READY',
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

        console.log('Updated session:', {
            sessionId: session.sessionId,
            participantsCount: session.participants.length,
            readyCount: session.participants.filter((p) => p.isReady).length,
        })

        return session
    }
}
