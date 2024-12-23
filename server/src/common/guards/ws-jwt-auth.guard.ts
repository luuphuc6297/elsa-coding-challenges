import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { UserService } from 'modules/user/services/user.service'

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private userService: UserService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client = context.switchToWs().getClient<Socket>()
            const token = this.extractToken(client)

            if (!token) {
                throw new UnauthorizedException('Authentication token not found')
            }

            const payload = this.jwtService.verify(token)
            const user = await this.userService.findByEmail(payload.email)

            if (!user) {
                throw new UnauthorizedException('User not found')
            }

            // Attach user to socket data for later use
            client.data.user = user
            return true
        } catch (error) {
            throw new WsException('Unauthorized')
        }
    }

    private extractToken(client: Socket): string | undefined {
        const auth = client.handshake.auth?.token || client.handshake.headers?.authorization

        if (!auth) {
            return undefined
        }

        return auth.split(' ')[1] || auth
    }
}
