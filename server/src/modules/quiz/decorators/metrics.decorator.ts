import { MetricsService } from 'shared/services/metrics.service'

// Metrics Decorator
export function TrackMetrics(operationName: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now()
            const metricsService = this.metricsService as MetricsService

            try {
                const result = await originalMethod.apply(this, args)
                await metricsService.trackLatency(operationName, Date.now() - startTime)
                return result
            } catch (error) {
                await metricsService.trackError(operationName, error.message)
                throw error
            }
        }

        return descriptor
    }
}

// Logging Decorator
export function LogOperation(operationName: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now()
            console.log(`Starting operation: ${operationName}`, {
                timestamp: new Date().toISOString(),
                args: args.map((arg) =>
                    arg instanceof Object ? { type: arg.constructor.name, id: arg.id } : arg
                ),
            })

            try {
                const result = await originalMethod.apply(this, args)
                console.log(`Completed operation: ${operationName}`, {
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime,
                })
                return result
            } catch (error) {
                console.error(`Error in operation: ${operationName}`, {
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    stack: error.stack,
                })
                throw error
            }
        }

        return descriptor
    }
}

// Combined Decorator
export function TrackAndLog(operationName: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Apply both decorators
        const withMetrics = TrackMetrics(operationName)(target, propertyKey, descriptor)
        const withLogging = LogOperation(operationName)(target, propertyKey, withMetrics)
        return withLogging
    }
}

export function ValidateQuizState(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
        const quizId = args[0]?.quizId || args[0]
        if (!quizId) {
            throw new Error('Quiz ID is required')
        }

        const stateManager = this.stateManager
        if (!stateManager) {
            throw new Error('StateManager not found in context')
        }

        const state = stateManager.getState(quizId)
        if (!state) {
            throw new Error('Quiz state not found')
        }

        return await originalMethod.apply(this, args)
    }

    return descriptor
}

export function CatchAndLogError(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
        try {
            return await originalMethod.apply(this, args)
        } catch (error) {
            console.error(`Error in ${propertyKey}:`, {
                error: error.message,
                stack: error.stack,
                args,
            })
            throw error
        }
    }

    return descriptor
}
