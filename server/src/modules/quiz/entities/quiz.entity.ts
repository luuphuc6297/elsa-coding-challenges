import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
export class Question {
    @Prop({ required: true })
    questionId: string

    @Prop({ required: true })
    content: string

    @Prop({ type: [String], required: true })
    options: string[]

    @Prop({ required: true })
    correctAnswer: string

    @Prop({ required: true })
    points: number

    @Prop({ default: 30 }) // 30 seconds default
    timeLimit: number
}

@Schema({ timestamps: true })
export class Quiz extends Document {
    @Prop({ required: true, unique: true })
    quizId: string

    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    description: string

    @Prop({ required: true })
    hostId: string

    @Prop({ type: [Question], required: true })
    questions: Question[]

    @Prop({ default: false })
    isActive: boolean

    @Prop({ default: 0 })
    duration: number // Total duration in minutes

    @Prop({ default: 0 })
    maxParticipants: number

    @Prop({ type: String, enum: ['public', 'private'], default: 'public' })
    visibility: string

    @Prop({ type: Date })
    startTime: Date

    @Prop({ type: Date })
    endTime: Date

    @Prop({ default: Date.now })
    createdAt: Date

    @Prop({ default: Date.now })
    updatedAt: Date
}

export const QuizSchema = SchemaFactory.createForClass(Quiz)
