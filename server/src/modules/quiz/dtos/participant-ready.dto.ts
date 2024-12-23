import { IsNotEmpty, IsString } from 'class-validator'

export class ParticipantReadyDto {
    @IsString()
    @IsNotEmpty()
    quizId: string

    @IsString()
    @IsNotEmpty()
    userId: string
}
