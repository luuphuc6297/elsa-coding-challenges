import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { UserService } from 'modules/user/services/user.service'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { User } from 'modules/user/entities/user.entity'

interface JwtPayload {
    email: string
    sub: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret'),
        })
    }

    /**
     * Validates JWT payload and returns user
     * @param payload - JWT payload containing user info
     * @returns User object if valid
     * @throws UnauthorizedException if user not found
     */
    async validate(payload: JwtPayload): Promise<User> {
        const user = await this.userService.findById(payload.sub)
        if (!user) {
            throw new UnauthorizedException()
        }
        return user
    }
}
