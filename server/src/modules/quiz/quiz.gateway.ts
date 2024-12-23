import { Injectable, UseGuards, UsePipes } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets'
import { createAdapter } from '@socket.io/redis-adapter'
import { WsRateLimitGuard } from 'common/guards/ws-rate-limit.guard'
import { WsValidationPipe } from 'common/pipes/validation.pipe'
import { LeaderboardService } from 'modules/leaderboard/services/leaderboard.service'
import { EVENTS } from 'shared/constants'
import { MetricsService } from 'shared/services/metrics.service'
import { RedisService } from 'shared/services/redis.service'
import { ResponseUtil } from 'shared/utils/response.util'
import { Socket, Server as SocketIOServer } from 'socket.io'
import { JoinQuizDto } from './dtos/join-quiz.dto'
import { ParticipantReadyDto } from './dtos/participant-ready.dto'
import { StartSessionDto } from './dtos/start-session.dto'
import { SubmitAnswerDto } from './dtos/submit-answer.dto'
import { IQuestionEndedEvent, ISessionCompletedEvent } from './interfaces/quiz-session.interface'
import { QuizService } from './services/quiz.service'

const QUIZ_CHANNEL = 'quiz_events'

@Injectable()
export class QuizGatewayProvider {
    constructor(private readonly redisService: RedisService) {}

    async createGatewayOptions() {
        await this.redisService.waitForConnection()
        const pubClient = this.redisService.getPubClient()
        const subClient = this.redisService.getSubClient()

        if (!pubClient || !subClient) {
            throw new Error('Redis clients not available')
        }

        return {
            namespace: '/quiz',
            cors: {
                origin: ['http://localhost:3002'],
                methods: ['GET', 'POST', 'OPTIONS'],
                credentials: true,
                allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
            },
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            adapter: createAdapter(pubClient, subClient),
        }
    }
}

@WebSocketGateway({
    namespace: '/quiz',
    cors: {
        origin: 'http://localhost:3002',
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    },
    transports: ['websocket'],
    allowEIO3: true,
})
@UseGuards(WsRateLimitGuard)
export class QuizGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: SocketIOServer

    private activeQuizzes: Map<
        string,
        {
            currentQuestionIndex: number
            timer: NodeJS.Timeout
            startTime?: number
            questionStartTime?: number
            participants: Set<string>
            submittedAnswers: Set<string>
        }
    > = new Map()

    constructor(
        private readonly quizService: QuizService,
        private readonly leaderboardService: LeaderboardService,
        private readonly redisService: RedisService,
        private readonly metricsService: MetricsService,
        private readonly jwtService: JwtService
    ) {}

    async afterInit() {
        try {
            await this.redisService.waitForConnection()
            const pubClient = this.redisService.getPubClient()
            const subClient = this.redisService.getSubClient()

            if (!pubClient || !subClient) {
                throw new Error('Redis clients not available')
            }

            // Subscribe vào kênh quiz events
            await this.redisService.subscribe(QUIZ_CHANNEL, (message) => {
                this.handleQuizEvent(message)
            })

            console.log('WebSocket Gateway initialized successfully')
        } catch (error) {
            console.error('Failed to initialize WebSocket Gateway:', error)
            throw error
        }
    }

    private async handleQuizEvent(message: any) {
        const { event, quizId, data } = message
        const startTime = Date.now()

        try {
            console.log('Handling quiz event:', { event, quizId, data })

            switch (event) {
                case EVENTS.SCORE_UPDATE:
                    console.log('Broadcasting SCORE_UPDATE to room:', quizId)
                    this.server.to(quizId).emit(EVENTS.SCORE_UPDATE, data)
                    break
                case EVENTS.LEADERBOARD_UPDATE:
                    console.log('Broadcasting LEADERBOARD_UPDATE to room:', quizId)
                    this.server.to(quizId).emit(EVENTS.LEADERBOARD_UPDATE, data)
                    break
                case EVENTS.SESSION_EVENT:
                    console.log('Broadcasting SESSION_EVENT to room:', quizId, data)

                    this.server.to(quizId).emit(EVENTS.SESSION_EVENT, data)
                    break
            }
        } catch (error) {
            console.error('Error handling quiz event:', error)
        } finally {
            const duration = Date.now() - startTime
            await this.metricsService.trackLatency('quiz_event_handling', duration)
        }
    }

    async handleConnection(client: Socket) {
        try {
            console.log('Client attempting connection:', {
                id: client.id,
                transport: client.conn.transport.name,
                headers: client.handshake.headers,
                auth: client.handshake.auth,
            })

            const token =
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1] ||
                client.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0]

            if (!token) {
                console.log('No token provided, disconnecting client:', client.id)
                client.emit('error', { message: 'Authentication required' })
                client.disconnect()
                return
            }

            try {
                const decoded = this.jwtService.verify(token)
                client['user'] = decoded
                console.log('Client authenticated successfully:', {
                    id: client.id,
                    userId: decoded.sub,
                    email: decoded.email,
                })
                await this.metricsService.trackWebSocketConnections(1)
            } catch (error) {
                console.error('Token verification failed:', {
                    error,
                    clientId: client.id,
                    token: token.substring(0, 10) + '...',
                })
                client.emit('error', { message: 'Invalid token' })
                client.disconnect()
            }
        } catch (error) {
            console.error('Connection error:', {
                error,
                clientId: client.id,
            })
            client.disconnect()
        }
    }

    async handleDisconnect(client: Socket) {
        console.log('Client disconnected:', client.id)
        console.log('Disconnect transport:', client.conn.transport.name)
        await this.metricsService.trackWebSocketConnections(-1)
    }

    @UsePipes(new WsValidationPipe())
    @SubscribeMessage(EVENTS.JOIN_QUIZ)
    async handleJoinQuiz(client: Socket, data: JoinQuizDto) {
        const startTime = Date.now()
        try {
            const session = await this.quizService.joinQuizSession(data.quizId, data.userId)
            client.join(data.quizId)

            const leaderboard = await this.leaderboardService.getLeaderboard(data.quizId)

            // Cập nhật danh sách người chơi trong quizState
            let quizState = this.activeQuizzes.get(data.quizId)
            if (!quizState) {
                quizState = {
                    currentQuestionIndex: 0,
                    timer: null,
                    startTime: Date.now(),
                    questionStartTime: null,
                    participants: new Set(),
                    submittedAnswers: new Set(),
                }
                this.activeQuizzes.set(data.quizId, quizState)
            }
            quizState.participants.add(data.userId)

            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.JOIN_QUIZ,
                quizId: data.quizId,
                data: { userId: data.userId },
            })

            // Track metrics
            await this.metricsService.trackQuizParticipants(
                data.quizId,
                session.participants.length
            )
            await this.metricsService.trackLatency('join_quiz', Date.now() - startTime)

            return ResponseUtil.success({
                session,
                leaderboard,
            })
        } catch (error) {
            await this.metricsService.trackError('join_quiz', error.message)
            return ResponseUtil.error(error.message)
        }
    }

    @UsePipes(new WsValidationPipe())
    @SubscribeMessage(EVENTS.SUBMIT_ANSWER)
    async handleSubmitAnswer(client: Socket, data: SubmitAnswerDto) {
        const startTime = Date.now()
        try {
            const quizState = this.activeQuizzes.get(data.quizId)
            if (!quizState) {
                throw new Error('Quiz session not found')
            }

            // Kiểm tra xem người chơi đã trả lời câu hỏi này chưa
            const answerKey = `${data.userId}_${data.questionId}`
            if (quizState.submittedAnswers.has(answerKey)) {
                throw new Error('Answer already submitted for this question')
            }

            const result = await this.quizService.submitAnswer(
                data.quizId,
                data.questionId,
                data.answer,
                data.userId,
                data.timeSpent
            )

            // Đánh dấu là đã trả lời
            quizState.submittedAnswers.add(answerKey)

            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.SCORE_UPDATE,
                quizId: data.quizId,
                data: {
                    userId: data.userId,
                    score: result.totalScore,
                    isCorrect: result.isCorrect,
                },
            })

            const leaderboard = await this.leaderboardService.updateLeaderboard({
                quizId: data.quizId,
                userId: data.userId,
                score: result.points,
                timeSpent: data.timeSpent,
                correctAnswers: result.isCorrect ? 1 : 0,
            })

            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.LEADERBOARD_UPDATE,
                quizId: data.quizId,
                data: { leaderboard },
            })

            // Kiểm tra nếu tất cả người chơi đã trả lời
            const allAnswered = Array.from(quizState.participants).every((participantId) =>
                quizState.submittedAnswers.has(`${participantId}_${data.questionId}`)
            )

            if (allAnswered) {
                // Kết thúc câu hỏi sớm nếu tất cả đã trả lời
                clearTimeout(quizState.timer)
                await this.handleEndQuestion(client, { quizId: data.quizId })
            }

            // Track metrics
            if (result.isCorrect) {
                await this.metricsService.trackCorrectAnswers(data.quizId)
            }
            await this.metricsService.trackQuestionResponseTime(data.quizId, data.timeSpent)
            await this.metricsService.trackLatency('submit_answer', Date.now() - startTime)

            return ResponseUtil.success(result)
        } catch (error) {
            await this.metricsService.trackError('submit_answer', error.message)
            return ResponseUtil.error(error.message)
        }
    }

    @SubscribeMessage(EVENTS.START_QUESTION)
    async handleStartQuestion(client: Socket, data: { quizId: string }) {
        const startTime = Date.now()
        try {
            const quiz = await this.quizService.findById(data.quizId)
            const quizState = this.activeQuizzes.get(data.quizId)

            if (!quizState) {
                throw new Error('Quiz not found')
            }

            const currentQuestion = quiz.questions[quizState.currentQuestionIndex]

            if (!currentQuestion) {
                throw new Error('Question not found at index ' + quizState.currentQuestionIndex)
            }

            // Reset state for new question
            quizState.questionStartTime = Date.now()
            quizState.submittedAnswers.clear()

            const questionData = {
                question: {
                    questionId: currentQuestion.questionId,
                    content: currentQuestion.content,
                    options: currentQuestion.options,
                    timeLimit: currentQuestion.timeLimit,
                    points: currentQuestion.points,
                },
                timeLimit: currentQuestion.timeLimit,
                questionIndex: quizState.currentQuestionIndex + 1,
                totalQuestions: quiz.questions.length,
                startTime: quizState.questionStartTime,
                correctAnswer: currentQuestion.correctAnswer,
            }

            // Emit directly to room
            console.log('Emitting QUESTION_STARTED to room:', {
                quizId: data.quizId,
                questionIndex: questionData.questionIndex,
                totalQuestions: questionData.totalQuestions,
            })
            this.server.to(data.quizId).emit(EVENTS.QUESTION_STARTED, questionData)

            // Publish to Redis
            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.QUESTION_STARTED,
                quizId: data.quizId,
                data: questionData,
            })

            // Set timer for question end
            quizState.timer = setTimeout(
                () => this.handleEndQuestion(client, data),
                currentQuestion.timeLimit * 1000
            )

            this.activeQuizzes.set(data.quizId, quizState)

            // Track metrics
            await this.metricsService.trackLatency('start_question', Date.now() - startTime)
        } catch (error) {
            console.error('Error in handleStartQuestion:', {
                error: error.message,
                quizId: data.quizId,
                clientId: client.id,
            })
            await this.metricsService.trackError('start_question', error.message)
            return ResponseUtil.error(error.message)
        }
    }

    @SubscribeMessage(EVENTS.QUESTION_ENDED)
    async handleEndQuestion(client: Socket, data: { quizId: string }) {
        const startTime = Date.now()
        try {
            const quiz = await this.quizService.findById(data.quizId)
            const quizState = this.activeQuizzes.get(data.quizId)

            if (!quizState) {
                throw new Error('Quiz session not found')
            }

            const currentQuestion = quiz.questions[quizState.currentQuestionIndex]
            const leaderboard = (await this.leaderboardService.getLeaderboard(
                data.quizId
            )) as Array<{
                userId: string
                username: string
                score: number
                timeSpent: number
                correctAnswers: number
            }>

            const event: IQuestionEndedEvent = {
                type: EVENTS.QUESTION_ENDED,
                data: {
                    questionId: currentQuestion.questionId,
                    correctAnswer: currentQuestion.correctAnswer,
                    leaderboard,
                    nextQuestionIn: 5,
                },
            }

            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.SESSION_EVENT,
                quizId: data.quizId,
                data: event,
            })

            if (quizState.currentQuestionIndex === quiz.questions.length - 1) {
                setTimeout(() => this.handleSessionComplete(data.quizId), 5000)
            } else {
                quizState.currentQuestionIndex++
                this.activeQuizzes.set(data.quizId, quizState)
                setTimeout(() => this.startNextQuestion(data.quizId), 5000)
            }

            // Track metrics
            await this.metricsService.trackLatency('end_question', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('end_question', error.message)
            return ResponseUtil.error(error.message)
        }
    }

    private async handleSessionComplete(quizId: string) {
        const startTime = Date.now()
        try {
            const leaderboard = (await this.leaderboardService.getLeaderboard(quizId)) as Array<{
                userId: string
                username: string
                score: number
                timeSpent: number
                correctAnswers: number
            }>
            const session = await this.quizService.endQuizSession(quizId)
            const quizState = this.activeQuizzes.get(quizId)

            const scores = leaderboard.map((entry) => entry.score)
            const statistics = {
                totalParticipants: session.participants.length,
                averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
                topScore: Math.max(...scores),
                duration: (Date.now() - quizState.startTime) / 1000,
            }

            const event: ISessionCompletedEvent = {
                type: EVENTS.SESSION_COMPLETED,
                data: {
                    leaderboard,
                    statistics,
                },
            }

            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.SESSION_EVENT,
                quizId,
                data: event,
            })

            this.activeQuizzes.delete(quizId)

            // Track metrics
            await this.metricsService.trackQuizCompletion(quizId)
            await this.metricsService.trackLatency('complete_session', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('complete_session', error.message)
            console.error('Error completing session:', error)
        }
    }

    private async startNextQuestion(quizId: string) {
        const client = this.server.to(quizId)
        await this.handleStartQuestion(client as any, { quizId })
    }

    @UsePipes(new WsValidationPipe())
    @SubscribeMessage(EVENTS.PARTICIPANT_READY)
    async handleParticipantReady(client: Socket, payload: ParticipantReadyDto) {
        const startTime = Date.now()
        try {
            console.log('Handling PARTICIPANT_READY event:', {
                clientId: client.id,
                payload,
                user: client['user'],
                transport: client.conn.transport.name,
            })

            if (!client['user']) {
                throw new Error('User not authenticated')
            }

            const session = await this.quizService.setParticipantReady(
                payload.quizId,
                payload.userId
            )

            console.log('Participant marked as ready:', {
                clientId: client.id,
                quizId: payload.quizId,
                userId: payload.userId,
                participantsCount: session.participants.length,
            })

            // Broadcast directly to the room first
            const eventData = {
                type: EVENTS.PARTICIPANT_READY,
                data: {
                    participants: session.participants,
                },
            }
            console.log('Broadcasting directly to room:', payload.quizId, eventData)
            this.server.to(payload.quizId).emit(EVENTS.SESSION_EVENT, eventData)

            // Then publish to Redis for other servers
            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.SESSION_EVENT,
                quizId: payload.quizId,
                data: eventData,
            })

            // Track metrics
            await this.metricsService.trackLatency('participant_ready', Date.now() - startTime)

            return ResponseUtil.success({ session })
        } catch (error) {
            console.error('Error handling PARTICIPANT_READY:', {
                error,
                clientId: client.id,
                payload,
            })
            await this.metricsService.trackError('participant_ready', error.message)
            return ResponseUtil.error(error.message)
        }
    }

    @UsePipes(new WsValidationPipe())
    @SubscribeMessage(EVENTS.START_SESSION)
    async handleStartSession(client: Socket, payload: StartSessionDto) {
        const startTime = Date.now()
        try {
            console.log('Received START_SESSION event:', {
                clientId: client.id,
                payload,
                user: client['user'],
            })

            if (!client['user']) {
                console.log('User not authenticated')
                throw new Error('User not authenticated')
            }

            const { session, questionsList } = await this.quizService.startQuizSession(
                payload.quizId
            )

            // Join room trước khi broadcast
            await client.join(payload.quizId)

            // Broadcast to room
            this.server.to(payload.quizId).emit(EVENTS.START_SESSION, {
                sessionId: session.sessionId,
                participants: session.participants,
                startTime: session.startTime,
                totalQuestions: questionsList.length,
            })

            // Log để debug
            console.log('Emitting START_SESSION event:', {
                roomName: payload.quizId,
                eventType: EVENTS.START_SESSION,
                totalQuestions: questionsList.length,
                sessionId: session.sessionId,
            })

            // Publish to Redis
            await this.redisService.publish(QUIZ_CHANNEL, {
                event: EVENTS.START_SESSION,
                quizId: payload.quizId,
                data: {
                    sessionId: session.sessionId,
                    participants: session.participants,
                    startTime: session.startTime,
                    totalQuestions: questionsList.length,
                },
            })

            // Initialize quiz state
            this.activeQuizzes.set(payload.quizId, {
                currentQuestionIndex: 0,
                timer: null,
                startTime: Date.now(),
                questionStartTime: null,
                participants: new Set(session.participants.map((p) => p.userId.toString())),
                submittedAnswers: new Set(),
            })

            // Start first question after delay
            setTimeout(() => this.startNextQuestion(payload.quizId), 5000)

            // Track metrics
            await this.metricsService.trackLatency('start_session', Date.now() - startTime)

            return ResponseUtil.success({ session })
        } catch (error) {
            console.error('Error starting session:', error)
            return ResponseUtil.error(error.message)
        }
    }
}
