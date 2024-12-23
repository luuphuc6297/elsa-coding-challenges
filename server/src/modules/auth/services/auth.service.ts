import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UserService } from 'modules/user/services/user.service'

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.userService.findByEmail(email)
        if (user && (await bcrypt.compare(password, user.password))) {
            const { ...result } = user.toObject()
            return result
        }
        return null
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user._id }
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
            },
        }
    }

    async verifyToken(token: string) {
        try {
            return this.jwtService.verify(token)
        } catch (error) {
            throw new UnauthorizedException('Invalid token')
        }
    }
}
