import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import * as redisStore from 'cache-manager-redis-store'
import { Leaderboard, LeaderboardSchema } from './entities/leaderboard.entity'
import { LeaderboardService } from './services/leaderboard.service'

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Leaderboard.name, schema: LeaderboardSchema }]),
        CacheModule.registerAsync({
            useFactory: (configService: ConfigService) => ({
                isGlobal: true,
                store: redisStore as any,
                host: configService.get('redis.host'),
                port: configService.get('redis.port'),
                ttl: 60,
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [LeaderboardService],
    exports: [LeaderboardService],
})
export class LeaderboardModule {}
