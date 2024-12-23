import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Observable } from 'rxjs'
import { Socket } from 'socket.io'

@Injectable()
export class WsAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const client: Socket = context.switchToWs().getClient()
        const token = client.handshake.headers.authorization?.split(' ')[1]

        try {
            const payload = this.jwtService.verify(token)
            client['user'] = payload
            return true
        } catch (error) {
            throw new UnauthorizedException('Invalid token')
        }
    }
}
