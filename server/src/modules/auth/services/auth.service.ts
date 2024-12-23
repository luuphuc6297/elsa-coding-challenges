import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { User } from 'modules/user/entities/user.entity'
import { UserService } from 'modules/user/services/user.service'

interface JwtPayload {
    email: string
    sub: string
}

export interface AuthResponse {
    accessToken: string
    user: {
        _id: string
        email: string
        username: string
        role: string
    }
}

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    /**
     * Validates user credentials
     * @param email - User's email
     * @param password - User's password
     * @returns User object without password if valid, null otherwise
     */
    async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
        const user = await this.userService.findByEmail(email)
        if (user && (await bcrypt.compare(password, user.password))) {
            const { ...result } = user.toObject()
            return result
        }
        return null
    }

    /**
     * Handles user login
     * @param user - User object without password
     * @returns Auth response containing access token and user info
     */
    async login(user: Omit<User, 'password'>): Promise<AuthResponse> {
        const payload: JwtPayload = { email: user.email, sub: user._id.toString() }
        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                _id: user._id.toString(),
                email: user.email,
                username: user.username,
                role: user.role,
            },
        }
    }

    /**
     * Verifies JWT token
     * @param token - JWT token to verify
     * @returns Decoded JWT payload
     */
    async verifyToken(token: string): Promise<JwtPayload> {
        try {
            return this.jwtService.verify(token) as JwtPayload
        } catch (error) {
            throw new UnauthorizedException('Invalid token')
        }
    }
}
