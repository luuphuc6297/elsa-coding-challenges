import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { CreateQuizDto } from '../dtos/create-quiz.dto'
import { Quiz } from '../entities/quiz.entity'
import { IQuizService } from '../interfaces/quiz.interface'

@Injectable()
export class QuizService implements IQuizService {
    constructor(@InjectModel(Quiz.name) private quizModel: Model<Quiz>) {}

    async createQuiz(createQuizDto: CreateQuizDto): Promise<Quiz> {
        const quiz = new this.quizModel({
            ...createQuizDto,
            quizId: uuidv4(),
        })
        return await quiz.save()
    }

    async findAll(): Promise<Quiz[]> {
        return await this.quizModel.find().exec()
    }

    async findById(id: string): Promise<Quiz> {
        const quiz = await this.quizModel.findOne({ quizId: id }).exec()
        if (!quiz) {
            throw new NotFoundException('Quiz not found')
        }
        return quiz
    }

    async updateQuiz(id: string, updateData: Partial<Quiz>): Promise<Quiz> {
        const quiz = await this.quizModel
            .findOneAndUpdate({ quizId: id }, { $set: updateData }, { new: true })
            .exec()

        if (!quiz) {
            throw new NotFoundException('Quiz not found')
        }

        return quiz
    }

    async deleteQuiz(id: string): Promise<void> {
        const result = await this.quizModel.deleteOne({ quizId: id })
        if (result.deletedCount === 0) {
            throw new NotFoundException('Quiz not found')
        }
    }

    async addQuestion(quizId: string, question: any): Promise<Quiz> {
        const quiz = await this.findById(quizId)
        quiz.questions.push({
            ...question,
            questionId: uuidv4(),
        })
        return await quiz.save()
    }

    async removeQuestion(quizId: string, questionId: string): Promise<Quiz> {
        const quiz = await this.findById(quizId)
        quiz.questions = quiz.questions.filter((q) => q.questionId !== questionId)
        return await quiz.save()
    }

    async updateQuestion(quizId: string, questionId: string, updateData: any): Promise<Quiz> {
        const quiz = await this.findById(quizId)
        const questionIndex = quiz.questions.findIndex((q) => q.questionId === questionId)

        if (questionIndex === -1) {
            throw new NotFoundException('Question not found')
        }

        quiz.questions[questionIndex] = {
            ...quiz.questions[questionIndex],
            ...updateData,
        }

        return await quiz.save()
    }
}
