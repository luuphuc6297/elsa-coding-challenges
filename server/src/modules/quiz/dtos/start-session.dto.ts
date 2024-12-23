import { IsNotEmpty, IsString } from 'class-validator'

export class StartSessionDto {
    @IsString()
    @IsNotEmpty()
    quizId: string

    @IsString()
    @IsNotEmpty()
    userId: string
}
