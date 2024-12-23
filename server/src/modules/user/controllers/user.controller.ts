import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard'
import { CreateUserDto } from '../dtos/create-user.dto'
import { UpdateUserDto } from '../dtos/update-user.dto'
import { UserService } from '../services/user.service'

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @ApiOperation({ summary: 'Create new user' })
    async create(@Body() createUserDto: CreateUserDto) {
        return await this.userService.create(createUserDto)
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users' })
    async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return await this.userService.findAll(page, limit)
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user by id' })
    async findOne(@Param('id') id: string) {
        return await this.userService.findById(id)
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user' })
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return await this.userService.update(id, updateUserDto)
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete user' })
    async remove(@Param('id') id: string) {
        return await this.userService.remove(id)
    }

    @Get(':id/quiz-history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user quiz history' })
    async getQuizHistory(@Param('id') id: string) {
        return await this.userService.getQuizHistory(id)
    }
}
