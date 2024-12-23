import { Injectable, OnModuleInit } from '@nestjs/common'
import { RedisService } from './redis.service'

interface MetricData {
    value: number
    timestamp: number
}

export interface Metric {
    name: string
    value: number
    type: 'counter' | 'gauge' | 'histogram'
    labels?: Record<string, string>
}

@Injectable()
export class MetricsService implements OnModuleInit {
    private readonly metrics: Map<string, MetricData> = new Map()
    private readonly METRICS_KEY = 'app:metrics:'
    private readonly FLUSH_INTERVAL = 10000 // 10 seconds

    constructor(private readonly redisService: RedisService) {}

    async onModuleInit() {
        // Periodically flush metrics to Redis
        setInterval(() => this.flushMetrics(), this.FLUSH_INTERVAL)
    }

    // Increment counter metric
    async incrementCounter(name: string, value: number = 1, labels: Record<string, string> = {}) {
        const key = this.getMetricKey(name, labels)
        const current = this.metrics.get(key)?.value || 0
        this.metrics.set(key, {
            value: current + value,
            timestamp: Date.now(),
        })
    }

    // Set gauge metric
    async setGauge(name: string, value: number, labels: Record<string, string> = {}) {
        const key = this.getMetricKey(name, labels)
        this.metrics.set(key, {
            value,
            timestamp: Date.now(),
        })
    }

    // Record histogram value
    async recordHistogram(name: string, value: number, labels: Record<string, string> = {}) {
        await this.redisService.publish('metrics', {
            name,
            value,
            type: 'histogram',
            labels,
            timestamp: Date.now(),
        })
    }

    // Get current value of a metric
    async getMetric(name: string, labels: Record<string, string> = {}): Promise<number | null> {
        const key = this.getMetricKey(name, labels)
        const data = this.metrics.get(key)
        return data?.value || null
    }

    // Get all metrics
    async getAllMetrics(): Promise<Metric[]> {
        const metrics: Metric[] = []
        for (const [key, data] of this.metrics.entries()) {
            const [name, ...labelParts] = key.split('|')
            const labels = this.parseLabels(labelParts.join('|'))
            metrics.push({
                name,
                value: data.value,
                type: 'counter', // Default type
                labels,
            })
        }
        return metrics
    }

    // Flush metrics to Redis
    private async flushMetrics() {
        const metrics = await this.getAllMetrics()
        if (metrics.length > 0) {
            await this.redisService.set(
                `${this.METRICS_KEY}${Date.now()}`,
                metrics,
                24 * 60 * 60 // TTL: 24 hours
            )
            this.metrics.clear()
        }
    }

    // Helper method to generate metric key
    private getMetricKey(name: string, labels: Record<string, string>): string {
        const labelString = Object.entries(labels)
            .map(([k, v]) => `${k}=${v}`)
            .join('|')
        return `${name}${labelString ? '|' + labelString : ''}`
    }

    // Helper method to parse labels from key
    private parseLabels(labelString: string): Record<string, string> {
        if (!labelString) return {}
        return labelString.split('|').reduce((acc, curr) => {
            const [key, value] = curr.split('=')
            if (key && value) acc[key] = value
            return acc
        }, {})
    }

    // Pre-defined metrics
    async trackWebSocketConnections(count: number) {
        await this.setGauge('ws_connections_active', count)
    }

    async trackQuizParticipants(quizId: string, count: number) {
        await this.setGauge('quiz_participants', count, { quiz_id: quizId })
    }

    async trackQuestionResponseTime(quizId: string, timeMs: number) {
        await this.recordHistogram('question_response_time_ms', timeMs, { quiz_id: quizId })
    }

    async trackCorrectAnswers(quizId: string) {
        await this.incrementCounter('correct_answers_total', 1, { quiz_id: quizId })
    }

    async trackQuizCompletion(quizId: string) {
        await this.incrementCounter('quiz_completions_total', 1, { quiz_id: quizId })
    }

    async trackError(type: string, message: string) {
        await this.incrementCounter('errors_total', 1, { type, message })
    }

    async trackRedisOperation(operation: string, success: boolean) {
        await this.incrementCounter('redis_operations_total', 1, {
            operation,
            status: success ? 'success' : 'failure',
        })
    }

    async trackWebSocketEvent(event: string) {
        await this.incrementCounter('ws_events_total', 1, { event })
    }

    async trackLatency(operation: string, timeMs: number) {
        await this.recordHistogram('operation_latency_ms', timeMs, { operation })
    }
}
