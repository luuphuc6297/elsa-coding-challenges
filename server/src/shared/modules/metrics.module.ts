import { Global, Module } from '@nestjs/common'
import { MetricsController } from '../controllers/metrics.controller'
import { MetricsService } from '../services/metrics.service'
import { RedisModule } from './redis.module'

@Global()
@Module({
    imports: [RedisModule],
    controllers: [MetricsController],
    providers: [MetricsService],
    exports: [MetricsService],
})
export class MetricsModule {}
