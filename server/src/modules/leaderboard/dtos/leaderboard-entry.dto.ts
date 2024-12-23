import { IsString, IsNumber, IsDate, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LeaderboardEntryDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty()
    @IsNumber()
    score: number

    @ApiProperty()
    @IsNumber()
    timeSpent: number

    @ApiProperty()
    @IsNumber()
    correctAnswers: number

    @ApiProperty()
    @IsDate()
    lastUpdated: Date
}
