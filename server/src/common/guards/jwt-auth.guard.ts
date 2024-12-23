import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { IS_PUBLIC_KEY } from 'common/decorators/public.decorator'
import { User } from 'modules/user/entities/user.entity'

interface AuthInfo {
    message?: string
    type?: string
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super()
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (isPublic) {
            return true
        }

        return super.canActivate(context)
    }

    /**
     * Handles the result of authentication
     * @param err - Error if authentication failed
     * @param user - User object if authentication successful
     * @param info - Additional info about the authentication
     * @returns User object if authentication successful
     * @throws UnauthorizedException if authentication failed
     */
    handleRequest<TUser = User>(err: Error | null, user: TUser | false, info: AuthInfo): TUser {
        if (err || !user) {
            throw err || new UnauthorizedException(info?.message || 'Authentication failed')
        }
        return user
    }
}
