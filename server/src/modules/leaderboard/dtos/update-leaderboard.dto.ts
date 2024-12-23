import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateLeaderboardDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    quizId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId: string

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    score: number

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    timeSpent: number

    @ApiProperty({ required: false })
    @IsNumber()
    @IsOptional()
    correctAnswers?: number

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    username?: string
}
