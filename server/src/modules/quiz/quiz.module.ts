import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { LeaderboardModule } from 'modules/leaderboard/leaderboard.module'
import { RedisService } from 'shared/services/redis.service'
import { QuizController } from './controllers/quiz.controller'
import { QuizSession, QuizSessionSchema } from './entities/quiz-session.entity'
import { Quiz, QuizSchema } from './entities/quiz.entity'
import { QuizGateway } from './quiz.gateway'
import { QuestionService } from './services/question.service'
import { QuizSessionService } from './services/quiz-session.service'
import { QuizService } from './services/quiz.service'
import { QuizStateManager } from './services/quiz-state.manager'
import { QuizEventHandlerService } from './services/quiz-event-handler.service'

class RedisIoAdapter extends IoAdapter {
    private adapterConstructor: ReturnType<typeof createAdapter>

    constructor(
        app: any,
        private readonly redisService: RedisService
    ) {
        super(app)
    }

    async connectToRedis(): Promise<void> {
        await this.redisService.waitForConnection()
        const pubClient = this.redisService.getPubClient()
        const subClient = this.redisService.getSubClient()

        if (!pubClient || !subClient) {
            throw new Error('Redis clients not available')
        }

        this.adapterConstructor = createAdapter(pubClient, subClient)
    }

    createIOServer(port: number, options?: any) {
        const server = super.createIOServer(port, options)
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor)
        } else {
            console.error('Adapter constructor not initialized')
        }
        return server
    }
}

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Quiz.name, schema: QuizSchema },
            { name: QuizSession.name, schema: QuizSessionSchema },
        ]),
        LeaderboardModule,
        JwtModule.registerAsync({
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret'),
                signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [QuizController],
    providers: [
        QuizService,
        QuestionService,
        QuizSessionService,
        QuizStateManager,
        QuizEventHandlerService,
        QuizGateway,
        {
            provide: 'WS_ADAPTER',
            useFactory: async (redisService: RedisService) => {
                const wsAdapter = new RedisIoAdapter(null, redisService)
                try {
                    await wsAdapter.connectToRedis()
                    console.log('Redis adapter initialized successfully')
                } catch (error) {
                    console.error('Failed to initialize Redis adapter:', error)
                    throw error
                }
                return wsAdapter
            },
            inject: [RedisService],
        },
    ],
    exports: [
        QuizService,
        QuestionService,
        QuizSessionService,
        QuizStateManager,
        QuizEventHandlerService,
    ],
})
export class QuizModule {}
