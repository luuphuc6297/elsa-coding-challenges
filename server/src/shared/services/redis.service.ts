import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { ResilienceService } from './resilience.service'
import { MetricsService } from './metrics.service'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private pubClient: Redis
    private subClient: Redis
    private isInitialized = false

    constructor(
        private configService: ConfigService,
        private resilienceService: ResilienceService,
        private metricsService: MetricsService
    ) {}

    async onModuleInit() {
        await this.initializeClients()
    }

    private async initializeClients() {
        if (this.isInitialized) {
            return
        }

        try {
            const redisConfig = {
                host: this.configService.get('redis.host'),
                port: this.configService.get('redis.port'),
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 500, 5000)
                    console.log(`Retrying Redis connection (attempt ${times}) in ${delay}ms`)
                    return delay
                },
                maxRetriesPerRequest: 5,
                connectTimeout: 10000,
                enableReadyCheck: true,
                showFriendlyErrorStack: true,
                lazyConnect: false,
            }

            this.pubClient = new Redis(redisConfig)
            this.subClient = new Redis(redisConfig)

            // Handle connection events
            this.pubClient.on('connect', () => {
                console.log('Redis Publisher connected')
            })

            this.subClient.on('connect', () => {
                console.log('Redis Subscriber connected')
            })

            this.pubClient.on('error', (err) => {
                console.error('Redis Publisher Error:', err)
            })

            this.subClient.on('error', (err) => {
                console.error('Redis Subscriber Error:', err)
            })

            // Wait for connections to be ready
            await Promise.all([
                new Promise<void>((resolve, reject) => {
                    this.pubClient.once('ready', () => {
                        console.log('Redis Publisher ready')
                        resolve()
                    })
                    this.pubClient.once('error', (err) => reject(err))
                }),
                new Promise<void>((resolve, reject) => {
                    this.subClient.once('ready', () => {
                        console.log('Redis Subscriber ready')
                        resolve()
                    })
                    this.subClient.once('error', (err) => reject(err))
                }),
            ])

            this.isInitialized = true
            console.log('Redis clients initialized successfully')
        } catch (error) {
            console.error('Failed to initialize Redis clients:', error)
            throw error
        }
    }

    async waitForConnection(timeout = 30000): Promise<void> {
        const startTime = Date.now()
        const retryInterval = 1000 // 1 second

        while (!this.isInitialized && Date.now() - startTime < timeout) {
            console.log('Waiting for Redis connection...')
            await new Promise((resolve) => setTimeout(resolve, retryInterval))

            if (!this.isInitialized) {
                try {
                    await this.initializeClients()
                } catch (error) {
                    console.error('Failed to initialize Redis clients, retrying...', error)
                }
            }
        }

        if (!this.isInitialized) {
            throw new Error('Redis clients failed to initialize within timeout')
        }
    }

    async onModuleDestroy() {
        if (this.pubClient) {
            await this.pubClient.quit()
        }
        if (this.subClient) {
            await this.subClient.quit()
        }
    }

    getPubClient(): Redis | null {
        return this.isInitialized ? this.pubClient : null
    }

    getSubClient(): Redis | null {
        return this.isInitialized ? this.subClient : null
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Redis service not initialized')
        }

        const serializedValue = JSON.stringify(value)
        await this.resilienceService.executeRedisOperation(async () => {
            if (ttl) {
                await this.pubClient.setex(key, ttl, serializedValue)
            } else {
                await this.pubClient.set(key, serializedValue)
            }
        })
    }

    async get(key: string): Promise<any> {
        if (!this.isInitialized) {
            throw new Error('Redis service not initialized')
        }

        return this.resilienceService.executeRedisOperation(async () => {
            const value = await this.pubClient.get(key)
            if (value) {
                return JSON.parse(value)
            }
            return null
        })
    }

    async del(key: string): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Redis service not initialized')
        }

        await this.resilienceService.executeRedisOperation(async () => {
            await this.pubClient.del(key)
        })
    }

    async publish(channel: string, message: any): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Redis service not initialized')
        }

        await this.resilienceService.executeRedisOperation(async () => {
            await this.pubClient.publish(channel, JSON.stringify(message))
        })
    }

    async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Redis service not initialized')
        }

        await this.resilienceService.executeRedisOperation(async () => {
            await this.subClient.subscribe(channel)
            this.subClient.on('message', (receivedChannel: string, message: string) => {
                if (receivedChannel === channel) {
                    try {
                        const parsedMessage = JSON.parse(message)
                        callback(parsedMessage)
                    } catch (error) {
                        console.error('Error parsing Redis message:', error)
                    }
                }
            })
        })
    }

    async unsubscribe(channel: string): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Redis service not initialized')
        }

        await this.resilienceService.executeRedisOperation(async () => {
            await this.subClient.unsubscribe(channel)
        })
    }

    async isConnected(): Promise<boolean> {
        return (
            this.isInitialized &&
            this.pubClient?.status === 'ready' &&
            this.subClient?.status === 'ready'
        )
    }

    async reconnect(): Promise<void> {
        this.isInitialized = false
        await this.initializeClients()
    }

    async hGetAll(key: string): Promise<Record<string, string>> {
        const startTime = Date.now()
        try {
            const result = await this.pubClient.hgetall(key)
            await this.metricsService.trackLatency('redis_hgetall', Date.now() - startTime)
            return result || {}
        } catch (error) {
            await this.metricsService.trackError('redis_hgetall', error.message)
            throw error
        }
    }

    async hSet(key: string, field: string, value: string): Promise<void> {
        const startTime = Date.now()
        try {
            await this.pubClient.hset(key, field, value)
            await this.metricsService.trackLatency('redis_hset', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('redis_hset', error.message)
            throw error
        }
    }
}
