import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class JoinQuizDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    quizId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    userId: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string
}
