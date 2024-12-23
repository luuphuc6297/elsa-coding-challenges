import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { RateLimiterService } from 'shared/services/rate-limiter.service'
import { Socket } from 'socket.io'

@Injectable()
export class WsRateLimitGuard implements CanActivate {
    constructor(private readonly rateLimiterService: RateLimiterService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client = context.switchToWs().getClient<Socket>()
        const event = context.getArgByIndex(1)?.event || 'default'
        const userId = client['user']?.sub

        if (!userId) {
            throw new WsException('Unauthorized')
        }

        const isBlocked = await this.rateLimiterService.isBlocked(userId, event)
        if (isBlocked) {
            throw new WsException('You are temporarily blocked due to rate limit violation')
        }

        const isAllowed = await this.rateLimiterService.consume(event, userId, event)
        if (!isAllowed) {
            const remaining = await this.rateLimiterService.getRemainingPoints(userId, event)
            throw new WsException(
                `Rate limit exceeded. Please wait before sending more requests. Remaining: ${remaining}`
            )
        }

        return true
    }
}
