import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from 'common/decorators/public.decorator'
import { LoginDto } from '../dtos/login.dto'
import { AuthService } from '../services/auth.service'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Public()
    @Post('login')
    @ApiOperation({ summary: 'User login' })
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password)
        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }
        return this.authService.login(user)
    }
}
