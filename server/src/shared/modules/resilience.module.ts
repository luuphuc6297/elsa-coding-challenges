import { Global, Module } from '@nestjs/common'
import { ResilienceService } from '../services/resilience.service'

@Global()
@Module({
    providers: [ResilienceService],
    exports: [ResilienceService],
})
export class ResilienceModule {}
