import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema()
class Answer {
    @Prop({ required: true })
    questionId: string

    @Prop({ required: true })
    answer: string

    @Prop({ required: true })
    isCorrect: boolean

    @Prop({ required: true })
    timeSpent: number

    @Prop({ default: Date.now })
    submittedAt: Date
}

@Schema()
class Participant {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId

    @Prop({ default: 0 })
    score: number

    @Prop({ type: [Answer], default: [] })
    answers: Answer[]

    @Prop({ default: Date.now })
    joinedAt: Date

    @Prop({ type: Boolean, default: false })
    hasCompleted: boolean

    @Prop({ type: Boolean, default: true })
    isActive: boolean

    @Prop({ type: Boolean, default: false })
    isReady: boolean

    @Prop({ type: Date })
    readyAt: Date
}

@Schema()
class SessionSettings {
    @Prop({ type: Boolean, default: false })
    shuffleQuestions: boolean

    @Prop({ type: Boolean, default: false })
    shuffleOptions: boolean

    @Prop({ type: Boolean, default: true })
    showResults: boolean
}

@Schema({ timestamps: true })
export class QuizSession extends Document {
    @Prop({ required: true, unique: true })
    sessionId: string

    @Prop({ required: true })
    quizId: string

    @Prop({ type: [Participant], default: [] })
    participants: Participant[]

    @Prop({
        type: String,
        enum: ['waiting', 'active', 'completed', 'cancelled'],
        default: 'waiting',
    })
    status: string

    @Prop({ required: true })
    startTime: Date

    @Prop()
    endTime: Date

    @Prop({ type: SessionSettings, default: () => ({}) })
    settings: SessionSettings

    @Prop([
        {
            type: {
                type: String,
                required: true,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
            data: {
                type: Object,
            },
        },
    ])
    events: Array<{
        type: string
        timestamp: Date
        data: any
    }>
}

export const QuizSessionSchema = SchemaFactory.createForClass(QuizSession)
