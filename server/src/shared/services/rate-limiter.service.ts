import { Injectable } from '@nestjs/common'
import { RedisService } from './redis.service'

interface RateLimitConfig {
    points: number // Maximum number of requests allowed
    duration: number // Time window in seconds
    blockDuration?: number // Duration to block if limit exceeded
}

@Injectable()
export class RateLimiterService {
    private readonly keyPrefix = 'ratelimit:'
    private readonly configs: Map<string, RateLimitConfig> = new Map([
        ['default', { points: 10, duration: 1 }], // 10 requests/second
        ['joinQuiz', { points: 5, duration: 60 }], // 5 joins/minute
        ['submitAnswer', { points: 1, duration: 1 }], // 1 answer/second
        ['chat', { points: 5, duration: 10 }], // 5 messages/10 seconds
    ])

    constructor(private readonly redisService: RedisService) {}

    async consume(key: string, userId: string, action: string = 'default'): Promise<boolean> {
        const config = this.configs.get(action) || this.configs.get('default')
        const redisKey = `${this.keyPrefix}${action}:${userId}`

        try {
            // Get current count and timestamp
            const data = await this.redisService.get(redisKey)
            const now = Date.now()

            if (!data) {
                // First request
                await this.redisService.set(redisKey, { count: 1, timestamp: now }, config.duration)
                return true
            }

            const { count, timestamp } = data
            const timeElapsed = (now - timestamp) / 1000

            if (timeElapsed > config.duration) {
                // Reset counter if duration has passed
                await this.redisService.set(redisKey, { count: 1, timestamp: now }, config.duration)
                return true
            }

            if (count >= config.points) {
                // Rate limit exceeded
                if (config.blockDuration) {
                    await this.redisService.set(
                        `${redisKey}:blocked`,
                        { timestamp: now },
                        config.blockDuration
                    )
                }
                return false
            }

            // Increment counter
            await this.redisService.set(redisKey, { count: count + 1, timestamp }, config.duration)
            return true
        } catch (error) {
            console.error('Rate limiter error:', error)
            return true // Allow request on error to prevent blocking legitimate users
        }
    }

    async isBlocked(userId: string, action: string = 'default'): Promise<boolean> {
        const blockedKey = `${this.keyPrefix}${action}:${userId}:blocked`
        const data = await this.redisService.get(blockedKey)
        return !!data
    }

    async getRemainingPoints(userId: string, action: string = 'default'): Promise<number> {
        const config = this.configs.get(action) || this.configs.get('default')
        const redisKey = `${this.keyPrefix}${action}:${userId}`
        const data = await this.redisService.get(redisKey)

        if (!data) {
            return config.points
        }

        const { count, timestamp } = data
        const timeElapsed = (Date.now() - timestamp) / 1000

        if (timeElapsed > config.duration) {
            return config.points
        }

        return Math.max(0, config.points - count)
    }
}
