import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard'
import { MetricsService } from '../services/metrics.service'

@ApiTags('Metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    @Get()
    async getMetrics() {
        const metrics = await this.metricsService.getAllMetrics()
        return {
            timestamp: Date.now(),
            metrics,
        }
    }

    @Get('ws')
    async getWebSocketMetrics() {
        const connections = await this.metricsService.getMetric('ws_connections_active')
        const events = await this.metricsService.getMetric('ws_events_total')
        const errors = await this.metricsService.getMetric('errors_total', { type: 'websocket' })

        return {
            timestamp: Date.now(),
            metrics: {
                activeConnections: connections || 0,
                totalEvents: events || 0,
                totalErrors: errors || 0,
            },
        }
    }

    @Get('quiz')
    async getQuizMetrics() {
        const completions = await this.metricsService.getMetric('quiz_completions_total')
        const correctAnswers = await this.metricsService.getMetric('correct_answers_total')
        const participants = await this.metricsService.getMetric('quiz_participants')

        return {
            timestamp: Date.now(),
            metrics: {
                totalCompletions: completions || 0,
                totalCorrectAnswers: correctAnswers || 0,
                activeParticipants: participants || 0,
            },
        }
    }

    @Get('performance')
    async getPerformanceMetrics() {
        const redisOps = await this.metricsService.getMetric('redis_operations_total')
        const latency = await this.metricsService.getMetric('operation_latency_ms')

        return {
            timestamp: Date.now(),
            metrics: {
                totalRedisOperations: redisOps || 0,
                averageLatency: latency || 0,
            },
        }
    }
}
