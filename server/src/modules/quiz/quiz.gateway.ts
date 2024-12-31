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
import { EVENTS, QUIZ_CONSTANTS } from 'shared/constants'
import { MetricsService } from 'shared/services/metrics.service'
import { RedisService } from 'shared/services/redis.service'
import { ResponseType, ResponseUtil } from 'shared/utils/response.util'
import { Socket, Server as SocketIOServer } from 'socket.io'
import { ISocketCommunication, SocketIOAdapter } from './adapters/socket.adapter'
import {
    JoinQuizCommand,
    StartQuestionCommand,
    StartQuizSessionCommand,
} from './commands/quiz.commands'
import { TrackAndLog } from './decorators/metrics.decorator'
import { ParticipantReadyDto } from './dtos/participant-ready.dto'
import {
    CompetitiveQuizSessionFactory,
    DefaultQuizSessionFactory,
    IQuizSessionFactory,
    PracticeQuizSessionFactory,
} from './factories/quiz-session.factory'
import {
    IQuestionResult,
    IQuizStartResult,
    ISubmitAnswerPayload,
    ParticipantStatus,
} from './interfaces/quiz.interface'
import { QuizStateManager } from './managers/quiz-state.manager'
import {
    LeaderboardObserver,
    QuizEventSubject,
    RedisObserver,
} from './observers/quiz-event.observer'
import { QuestionService } from './services/question.service'
import { QuizSessionService } from './services/quiz-session.service'
import { QuizService } from './services/quiz.service'
import { IScoringStrategy, TimeBasedScoringStrategy } from './strategies/scoring.strategy'

@WebSocketGateway({
    namespace: '/quiz',
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
    },
    transports: ['websocket'],
    allowEIO3: true,
})
@UseGuards(WsRateLimitGuard)
@Injectable()
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

    private quizEventSubject: QuizEventSubject
    private scoringStrategy: IScoringStrategy
    private sessionFactories: Map<string, IQuizSessionFactory>
    private socketAdapter: ISocketCommunication
    private quizStateManager: QuizStateManager

    constructor(
        private readonly quizService: QuizService,
        private readonly questionService: QuestionService,
        private readonly quizSessionService: QuizSessionService,
        private readonly leaderboardService: LeaderboardService,
        private readonly redisService: RedisService,
        private readonly metricsService: MetricsService,
        private readonly jwtService: JwtService
    ) {
        this.initializeServices()
    }

    private initializeServices(): void {
        // Initialize socket adapter
        this.socketAdapter = new SocketIOAdapter(this.server, this.metricsService)

        // Initialize observers
        this.quizEventSubject = new QuizEventSubject()
        this.quizEventSubject.addObserver(new LeaderboardObserver(this.leaderboardService))
        this.quizEventSubject.addObserver(new RedisObserver(this.redisService))

        // Initialize scoring strategy
        this.scoringStrategy = new TimeBasedScoringStrategy()

        // Initialize session factories
        this.sessionFactories = new Map()
        this.sessionFactories.set('default', new DefaultQuizSessionFactory())
        this.sessionFactories.set('competitive', new CompetitiveQuizSessionFactory())
        this.sessionFactories.set('practice', new PracticeQuizSessionFactory())

        // Initialize quiz state manager
        this.quizStateManager = new QuizStateManager()
    }

    async afterInit() {
        try {
            await this.redisService.waitForConnection()
            const pubClient = this.redisService.getPubClient()
            const subClient = this.redisService.getSubClient()

            if (!pubClient || !subClient) {
                throw new Error('Redis clients not available')
            }

            this.server.adapter(createAdapter(pubClient, subClient))
            console.log('WebSocket Gateway initialized successfully')
        } catch (error) {
            console.error('Failed to initialize WebSocket Gateway:', error)
            throw error
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
    @SubscribeMessage(EVENTS.PARTICIPANT_READY)
    @TrackAndLog('participant_ready')
    async handleParticipantReady(
        client: Socket,
        payload: ParticipantReadyDto
    ): Promise<ResponseType<IQuizStartResult>> {
        try {
            if (!client['user']) {
                throw new Error('User not authenticated')
            }

            // STEP 1: Find or Create Quiz Session
            const startSessionCommand = new StartQuizSessionCommand(
                payload.quizId,
                payload.userId,
                this.quizSessionService,
                this.quizService,
                this.metricsService
            )
            const session = await startSessionCommand.execute()

            // STEP 2: Join Quiz and Update Leaderboard
            const joinQuizCommand = new JoinQuizCommand(
                session,
                client,
                this.leaderboardService,
                this.quizEventSubject,
                this.metricsService
            )
            await joinQuizCommand.execute()

            // STEP 3: Initialize and Start Question
            const startQuestionCommand = new StartQuestionCommand(
                session,
                this.quizService,
                this.quizStateManager,
                this.quizEventSubject,
                this.metricsService
            )
            const questionData = await startQuestionCommand.execute()

            // STEP 4: Get Leaderboard
            const leaderboard = await this.leaderboardService.getLeaderboard(session.quizId)

            const result: IQuizStartResult = {
                session,
                question: questionData,
                leaderboard,
            }

            return ResponseUtil.success<IQuizStartResult>(result)
        } catch (error) {
            return ResponseUtil.error<IQuizStartResult>(error.message)
        }
    }

    @SubscribeMessage(EVENTS.SUBMIT_ANSWER)
    @UseGuards(WsRateLimitGuard)
    async handleSubmitAnswer(
        client: Socket,
        payload: ISubmitAnswerPayload
    ): Promise<ResponseType<IQuestionResult>> {
        try {
            const { quizId, questionId, answer, userId } = payload

            // Validate quiz session
            const session = await this.quizSessionService.validateSession(quizId)
            const question = await this.quizService.getQuestionById(questionId)

            // Calculate time spent and points
            const timeSpent = Date.now() - session.startTime.getTime()
            const points = this.scoringStrategy.calculatePoints(
                timeSpent,
                QUIZ_CONSTANTS.QUESTION_TIME_LIMIT,
                QUIZ_CONSTANTS.BASE_POINTS
            )

            // Record answer and update score
            this.quizStateManager.submitAnswer(quizId, userId, answer, points)

            // Get updated participant data
            const totalScore = this.quizStateManager.getParticipantScore(quizId, userId)
            const leaderboard = this.quizStateManager.getLeaderboard(quizId)

            // Emit leaderboard update to all participants
            this.server.to(quizId).emit(EVENTS.LEADERBOARD_UPDATE, leaderboard)

            // Check if all participants have answered
            if (this.quizStateManager.haveAllParticipantsAnswered(quizId)) {
                await this.handleNextQuestion(quizId)
            }

            return ResponseUtil.success({
                isCorrect: answer === question.correctAnswer,
                points,
                correctAnswer: question.correctAnswer,
                timeSpent,
                totalScore,
                correctAnswers:
                    leaderboard.find((p) => p.userId.toString() === userId)?.correctAnswers || 0,
            })
        } catch (error) {
            return ResponseUtil.error(error.message)
        }
    }

    @SubscribeMessage(EVENTS.RECONNECT_SESSION)
    async handleReconnect(
        client: Socket,
        payload: { quizId: string; userId: string }
    ): Promise<ResponseType<any>> {
        try {
            const { quizId, userId } = payload
            const session = await this.quizSessionService.findActiveSession(quizId)

            if (!session) {
                throw new Error('Session expired or not found')
            }

            // Update participant status
            this.quizStateManager.updateParticipantStatus(quizId, userId, ParticipantStatus.TAKING)

            // Join socket room
            client.join(quizId)

            // Get current game state
            const currentQuestion = await this.quizService.getCurrentQuestion(session)
            const leaderboard = this.quizStateManager.getLeaderboard(quizId)

            return ResponseUtil.success({
                session,
                currentQuestion,
                leaderboard,
            })
        } catch (error) {
            return ResponseUtil.error(error.message)
        }
    }

    private async handleNextQuestion(quizId: string): Promise<void> {
        try {
            const session = await this.quizSessionService.findActiveSession(quizId)
            if (!session) return

            const nextQuestion = await this.quizService.getNextQuestion(session)
            if (!nextQuestion) {
                // End quiz if no more questions
                await this.quizSessionService.endSession(quizId)
                this.quizStateManager.endSession(quizId)
                this.server.to(quizId).emit(EVENTS.QUIZ_COMPLETED, {
                    leaderboard: this.quizStateManager.getLeaderboard(quizId),
                })
                return
            }

            // Start next question
            this.quizStateManager.startQuestion(
                quizId,
                nextQuestion.id,
                QUIZ_CONSTANTS.QUESTION_TIME_LIMIT
            )

            // Emit next question to all participants
            this.server.to(quizId).emit(EVENTS.NEXT_QUESTION, {
                question: nextQuestion,
                timeLimit: QUIZ_CONSTANTS.QUESTION_TIME_LIMIT,
            })

            // Set timer for question timeout
            setTimeout(() => {
                this.handleQuestionTimeout(quizId)
            }, QUIZ_CONSTANTS.QUESTION_TIME_LIMIT)
        } catch (error) {
            console.error('Error handling next question:', error)
        }
    }

    private async handleQuestionTimeout(quizId: string): Promise<void> {
        try {
            const session = await this.quizSessionService.findActiveSession(quizId)
            if (!session) return

            // Get participants who haven't answered
            const allParticipants = this.quizStateManager.getAllParticipantIds(quizId)
            const currentQuestion = await this.quizService.getCurrentQuestion(session)

            // Record timeout for participants who haven't answered
            allParticipants.forEach((userId) => {
                if (!this.quizStateManager.hasSubmittedAnswer(quizId, userId)) {
                    this.quizStateManager.submitAnswer(quizId, userId, '', 0)
                }
            })

            // Emit timeout event with correct answer
            this.server.to(quizId).emit(EVENTS.QUESTION_TIMEOUT, {
                correctAnswer: currentQuestion.correctAnswer,
                leaderboard: this.quizStateManager.getLeaderboard(quizId),
            })

            // Move to next question
            await this.handleNextQuestion(quizId)
        } catch (error) {
            console.error('Error handling question timeout:', error)
        }
    }
}
