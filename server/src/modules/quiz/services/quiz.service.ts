import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Quiz } from '../entities/quiz.entity'
import { IQuizSession } from '../interfaces/quiz.interface'

@Injectable()
export class QuizService {
    constructor(@InjectModel(Quiz.name) private readonly quizModel: Model<Quiz>) {}

    async getQuestionById(questionId: string): Promise<any> {
        const quiz = await this.quizModel.findOne({ 'questions._id': questionId })
        if (!quiz) {
            throw new Error('Question not found')
        }
        return quiz.questions.find((q) => q.questionId === questionId)
    }

    async getCurrentQuestion(session: IQuizSession): Promise<any> {
        const quiz = await this.quizModel.findById(session.quizId)
        if (!quiz) {
            throw new Error('Quiz not found')
        }
        return quiz.questions[session.currentQuestionIndex]
    }

    async getNextQuestion(session: IQuizSession): Promise<any> {
        const quiz = await this.quizModel.findById(session.quizId)
        if (!quiz) {
            throw new Error('Quiz not found')
        }

        const nextIndex = session.currentQuestionIndex + 1
        if (nextIndex >= quiz.questions.length) {
            return null
        }

        return quiz.questions[nextIndex]
    }

    async validateQuizAccess(quizId: string, userId: string): Promise<boolean> {
        const quiz = await this.quizModel.findById(quizId)
        if (!quiz) {
            return false
        }
        // Check if quiz is public or user is the creator
        return quiz.isPublic || quiz.createdBy.toString() === userId
    }

    async findById(id: string): Promise<Quiz | null> {
        return this.quizModel.findById(id)
    }
}
