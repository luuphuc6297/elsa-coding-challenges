import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard'
import { CreateQuizDto } from '../dtos/create-quiz.dto'
import { QuizService } from '../services/quiz.service'

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
    constructor(private readonly quizService: QuizService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new quiz' })
    async createQuiz(@Body() createQuizDto: CreateQuizDto) {
        return await this.quizService.createQuiz(createQuizDto)
    }

    @Get()
    @ApiOperation({ summary: 'Get all quizzes' })
    async getAllQuizzes() {
        return await this.quizService.findAll()
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get quiz by ID' })
    async getQuizById(@Param('id') id: string) {
        return await this.quizService.findById(id)
    }
}
