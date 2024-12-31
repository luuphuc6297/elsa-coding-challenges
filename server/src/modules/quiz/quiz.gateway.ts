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
import { IQuizStartResult } from './interfaces/quiz.interface'
import { QuizStateManager } from './managers/quiz-state.manager'
import {
    LeaderboardObserver,
    QuizEventSubject,
    RedisObserver,
} from './observers/quiz-event.observer'
import { QuestionService } from './services/question.service'
import { QuizSessionService } from './services/quiz-session.service'
import { QuizService } from './services/quiz.service'
import {
    BasicScoringStrategy,
    IScoringStrategy,
    ProgressiveScoringStrategy,
    TimeBasedScoringStrategy,
} from './strategies/scoring.strategy'

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
    private scoringStrategies: Map<string, IScoringStrategy>
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

        // Initialize scoring strategies
        this.scoringStrategies = new Map()
        this.scoringStrategies.set('default', new TimeBasedScoringStrategy())
        this.scoringStrategies.set('progressive', new ProgressiveScoringStrategy())
        this.scoringStrategies.set('basic', new BasicScoringStrategy())

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
}
