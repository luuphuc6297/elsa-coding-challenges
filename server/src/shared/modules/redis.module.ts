import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RateLimiterService } from '../services/rate-limiter.service'
import { RedisService } from '../services/redis.service'
import { ResilienceModule } from './resilience.module'

@Global()
@Module({
    imports: [ConfigModule, ResilienceModule],
    providers: [RedisService, RateLimiterService],
    exports: [RedisService, RateLimiterService],
})
export class RedisModule {}
