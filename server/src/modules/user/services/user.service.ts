import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import { Model } from 'mongoose'
import { CreateUserDto } from '../dtos/create-user.dto'
import { UpdateUserDto } from '../dtos/update-user.dto'
import { User } from '../entities/user.entity'

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.userModel.findOne({
            email: createUserDto.email,
        })

        if (existingUser) {
            throw new ConflictException('Email already exists')
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

        const user = new this.userModel({
            ...createUserDto,
            password: hashedPassword,
        })

        return await user.save()
    }

    async findAll(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit
        const total = await this.userModel.countDocuments()
        const users = await this.userModel.find().select('-password').skip(skip).limit(limit).exec()

        return {
            data: users,
            total,
            page,
            lastPage: Math.ceil(total / limit),
        }
    }

    async findById(id: string): Promise<User> {
        const user = await this.userModel.findById(id).select('-password')
        if (!user) {
            throw new NotFoundException('User not found')
        }
        return user
    }

    async findByEmail(email: string): Promise<User> {
        return await this.userModel.findOne({ email })
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10)
        }

        const user = await this.userModel
            .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
            .select('-password')

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }

    async remove(id: string): Promise<void> {
        const result = await this.userModel.deleteOne({ _id: id })
        if (result.deletedCount === 0) {
            throw new NotFoundException('User not found')
        }
    }

    async getQuizHistory(userId: string) {
        const user = await this.userModel
            .findById(userId)
            .select('quizHistory')
            .populate('quizHistory.quizId')

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user.quizHistory
    }

    async updateQuizHistory(userId: string, quizData: any) {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new NotFoundException('User not found')
        }

        user.quizHistory.push(quizData)
        user.totalScore += quizData.score
        user.quizzesTaken += 1

        return await user.save()
    }
}
