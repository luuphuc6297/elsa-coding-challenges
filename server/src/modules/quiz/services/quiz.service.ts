import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { CACHE_KEYS, EVENTS, QUIZ_STATUS } from 'shared/constants'
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

    async joinQuizSession(quizId: string, userId: string): Promise<QuizSession> {
        const quiz = await this.findById(quizId)

        let session = await this.quizSessionModel.findOne({
            quizId: quiz.quizId,
            status: QUIZ_STATUS.WAITING,
        })

        if (!session) {
            session = new this.quizSessionModel({
                quizId: quiz.quizId,
                sessionId: uuidv4(),
                participants: [],
                status: QUIZ_STATUS.WAITING,
                startTime: new Date(),
                settings: {
                    shuffleQuestions: true,
                    shuffleOptions: true,
                    showResults: true,
                },
            })
        }

        if (!session.participants.find((p) => p.userId.toString() === userId)) {
            session.participants.push({
                userId: new Types.ObjectId(userId),
                score: 0,
                answers: [],
                joinedAt: new Date(),
                hasCompleted: false,
                isActive: true,
                isReady: false,
                readyAt: null,
            })
        }

        await session.save()
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

    async startQuizSession(quizId: string) {
        console.log('Starting quiz session:', { quizId })

        const quiz = await this.findById(quizId)
        console.log('Found quiz:', {
            quizId: quiz.quizId,
            title: quiz.title,
            hostId: quiz.hostId,
            isActive: quiz.isActive,
            startTime: quiz.startTime,
            endTime: quiz.endTime,
        })

        let session = await this.quizSessionModel.findOne({
            quizId: quiz.quizId,
            status: QUIZ_STATUS.WAITING,
        })

        if (!session) {
            console.log('No waiting session found, creating new session')
            session = new this.quizSessionModel({
                quizId: quiz.quizId,
                sessionId: uuidv4(),
                participants: [],
                status: QUIZ_STATUS.WAITING,
                startTime: new Date(),
                settings: {
                    shuffleQuestions: true,
                    shuffleOptions: true,
                    showResults: true,
                },
                events: [],
            })
            await session.save()
        }

        // Kiểm tra điều kiện start session
        const allReady = session.participants.every((p) => p.isReady)
        if (!allReady) {
            console.log('Not all participants are ready:', {
                readyCount: session.participants.filter((p) => p.isReady).length,
                totalCount: session.participants.length,
                notReadyParticipants: session.participants
                    .filter((p) => !p.isReady)
                    .map((p) => ({
                        userId: p.userId,
                        joinedAt: p.joinedAt,
                    })),
            })
            throw new Error('Not all participants are ready')
        }

        // Lấy quiz và câu hỏi
        const questions = quiz.questions.map((q) => ({
            questionId: q.questionId,
            content: q.content,
            options: q.options,
            timeLimit: q.timeLimit,
            points: q.points,
        }))

        // Cập nhật trạng thái session
        session.status = QUIZ_STATUS.ACTIVE
        session.startTime = new Date()
        session.events.push({
            type: EVENTS.START_SESSION,
            timestamp: new Date(),
            data: {
                participants: session.participants,
                startTime: session.startTime,
                questionsList: questions,
            },
        })

        await session.save()
        return {
            session,
            questionsList: questions,
        }
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
