import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SubmitAnswerDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    quizId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    questionId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    answer: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId: string

    @ApiProperty()
    @IsNumber()
    @Min(0)
    timeSpent: number
}
