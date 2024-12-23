import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateUserDto {
    @ApiProperty()
    @IsString()
    @MinLength(3)
    username: string

    @ApiProperty()
    @IsEmail()
    email: string

    @ApiProperty()
    @IsString()
    @MinLength(6)
    password: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    fullName?: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    avatar?: string
}
