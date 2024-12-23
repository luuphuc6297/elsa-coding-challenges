import { Injectable, Logger } from '@nestjs/common'

interface CircuitBreakerConfig {
    failureThreshold: number
    resetTimeout: number
    halfOpenTimeout: number
}

interface RetryConfig {
    maxAttempts: number
    delay: number
    exponential: boolean
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

@Injectable()
export class ResilienceService {
    private readonly logger = new Logger(ResilienceService.name)
    private readonly circuitStates: Map<string, CircuitState> = new Map()
    private readonly failureCounters: Map<string, number> = new Map()
    private readonly lastFailureTime: Map<string, number> = new Map()

    private readonly defaultCircuitConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 30000,
        halfOpenTimeout: 5000,
    }

    private readonly defaultRetryConfig: RetryConfig = {
        maxAttempts: 3,
        delay: 1000,
        exponential: true,
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        serviceName: string,
        config: Partial<RetryConfig> = {}
    ): Promise<T> {
        const retryConfig = { ...this.defaultRetryConfig, ...config }
        let lastError: Error

        for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
            try {
                await this.checkCircuitState(serviceName)
                const result = await operation()
                await this.handleSuccess(serviceName)
                return result
            } catch (error) {
                lastError = error
                await this.handleFailure(serviceName, error)

                if (attempt < retryConfig.maxAttempts) {
                    const delay = retryConfig.exponential
                        ? retryConfig.delay * Math.pow(2, attempt - 1)
                        : retryConfig.delay
                    await this.sleep(delay)
                }
            }
        }

        throw lastError
    }

    private async checkCircuitState(serviceName: string): Promise<void> {
        const state = this.circuitStates.get(serviceName)
        const lastFailure = this.lastFailureTime.get(serviceName) || 0
        const now = Date.now()

        switch (state) {
            case 'OPEN':
                if (now - lastFailure >= this.defaultCircuitConfig.resetTimeout) {
                    this.circuitStates.set(serviceName, 'HALF_OPEN')
                    this.logger.log(
                        `Circuit state changed to HALF_OPEN for service: ${serviceName}`
                    )
                } else {
                    throw new Error(`Circuit is OPEN for service: ${serviceName}`)
                }
                break

            case 'HALF_OPEN':
                this.circuitStates.set(serviceName, 'OPEN')
                this.logger.log(`Circuit state changed to OPEN for service: ${serviceName}`)
                break

            case 'CLOSED':
            default:
                break
        }
    }

    private async handleSuccess(serviceName: string): Promise<void> {
        this.failureCounters.delete(serviceName)
        this.lastFailureTime.delete(serviceName)
        this.circuitStates.set(serviceName, 'CLOSED')
        this.logger.debug(`Operation succeeded for service: ${serviceName}`)
    }

    private async handleFailure(serviceName: string, error: Error): Promise<void> {
        const failures = (this.failureCounters.get(serviceName) || 0) + 1
        this.failureCounters.set(serviceName, failures)
        this.lastFailureTime.set(serviceName, Date.now())

        this.logger.error(`Operation failed for service: ${serviceName}, error: ${error.message}`)

        if (failures >= this.defaultCircuitConfig.failureThreshold) {
            this.circuitStates.set(serviceName, 'OPEN')
            this.logger.warn(`Circuit OPENED for service: ${serviceName} due to too many failures`)
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async getCircuitState(serviceName: string): Promise<CircuitState> {
        return this.circuitStates.get(serviceName) || 'CLOSED'
    }

    async getFailureCount(serviceName: string): Promise<number> {
        return this.failureCounters.get(serviceName) || 0
    }

    async resetCircuit(serviceName: string): Promise<void> {
        this.circuitStates.set(serviceName, 'CLOSED')
        this.failureCounters.set(serviceName, 0)
        this.lastFailureTime.delete(serviceName)
        this.logger.log(`Circuit reset for service: ${serviceName}`)
    }

    // Wrapper methods for common operations
    async executeRedisOperation<T>(operation: () => Promise<T>): Promise<T> {
        return this.executeWithRetry(operation, 'redis')
    }

    async executeMongoOperation<T>(operation: () => Promise<T>): Promise<T> {
        return this.executeWithRetry(operation, 'mongodb', {
            maxAttempts: 5,
            delay: 2000,
        })
    }

    async executeExternalApiCall<T>(operation: () => Promise<T>): Promise<T> {
        return this.executeWithRetry(operation, 'external-api', {
            maxAttempts: 2,
            delay: 3000,
        })
    }
}
