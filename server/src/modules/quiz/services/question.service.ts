import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Quiz } from '../entities/quiz.entity'
import { IQuestionService } from '../interfaces/quiz.interface'

@Injectable()
export class QuestionService implements IQuestionService {
    constructor(@InjectModel(Quiz.name) private quizModel: Model<Quiz>) {}

    async validateAnswer(
        questionId: string,
        answer: string,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): Promise<{ isCorrect: boolean; points: number }> {
        const quiz = await this.quizModel.findOne({ 'questions.questionId': questionId })
        if (!quiz) {
            throw new Error('Question not found')
        }

        const question = quiz.questions.find((q) => q.questionId === questionId)
        const isCorrect = question.correctAnswer === answer
        const points = this.calculatePoints(isCorrect, timeSpent, timeLimit, maxPoints)

        return {
            isCorrect,
            points,
        }
    }

    private calculatePoints(
        isCorrect: boolean,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): number {
        if (!isCorrect) return 0

        // Time bonus: faster answers get more points
        const timeBonus = Math.max(0, 1 - timeSpent / timeLimit)
        return Math.round(maxPoints * (0.7 + 0.3 * timeBonus))
    }
}
