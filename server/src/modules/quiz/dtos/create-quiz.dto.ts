import { IsString, IsArray, IsNumber, ValidateNested, IsNotEmpty } from 'class-validator'
import { Type } from 'class-transformer'

class QuestionDto {
    @IsString()
    @IsNotEmpty()
    content: string

    @IsArray()
    @IsString({ each: true })
    options: string[]

    @IsString()
    @IsNotEmpty()
    correctAnswer: string

    @IsNumber()
    points: number
}

export class CreateQuizDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionDto)
    questions: QuestionDto[]
}
