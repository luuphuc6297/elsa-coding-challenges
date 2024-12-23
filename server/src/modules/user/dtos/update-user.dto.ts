import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateUserDto {
    @ApiProperty({ required: false })
    @IsString()
    @MinLength(3)
    @IsOptional()
    username?: string

    @ApiProperty({ required: false })
    @IsEmail()
    @IsOptional()
    email?: string

    @ApiProperty({ required: false })
    @IsString()
    @MinLength(6)
    @IsOptional()
    password?: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    fullName?: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    avatar?: string

    @ApiProperty({ required: false })
    @IsOptional()
    lastLogin?: Date

    @ApiProperty({ required: false })
    @IsOptional()
    isActive?: boolean
}
