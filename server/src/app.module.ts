import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import configuration from './config/configuration'
import { AuthModule } from './modules/auth/auth.module'
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module'
import { QuizModule } from './modules/quiz/quiz.module'
import { UserModule } from './modules/user/user.module'
import { MetricsModule } from './shared/modules/metrics.module'
import { RedisModule } from './shared/modules/redis.module'
import { ResilienceModule } from './shared/modules/resilience.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                uri: configService.get<string>('database.uri'),
            }),
            inject: [ConfigService],
        }),
        CacheModule.register({
            isGlobal: true,
        }),
        RedisModule,
        MetricsModule,
        ResilienceModule,
        AuthModule,
        UserModule,
        QuizModule,
        LeaderboardModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
})
export class AppModule {}
