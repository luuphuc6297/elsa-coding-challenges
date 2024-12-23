import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateLeaderboardDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    quizId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    sessionId: string
}
