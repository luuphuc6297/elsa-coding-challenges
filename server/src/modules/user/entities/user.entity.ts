import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
class QuizHistory {
    @Prop({ type: String, ref: 'Quiz' })
    quizId: string

    @Prop()
    score: number

    @Prop()
    completedAt: Date

    @Prop()
    timeSpent: number

    @Prop()
    correctAnswers: number

    @Prop()
    totalQuestions: number
}

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true })
    username: string

    @Prop({ required: true, unique: true })
    email: string

    @Prop({ required: true })
    password: string

    @Prop()
    fullName: string

    @Prop()
    avatar: string

    @Prop({ default: 0 })
    totalScore: number

    @Prop({ default: 0 })
    quizzesTaken: number

    @Prop({ type: [QuizHistory], default: [] })
    quizHistory: QuizHistory[]

    @Prop({ default: [] })
    achievements: string[]

    @Prop({ type: Boolean, default: false })
    isVerified: boolean

    @Prop({ type: Date })
    lastLogin: Date

    @Prop({ default: true })
    isActive: boolean

    @Prop({
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user',
    })
    role: string
}

export const UserSchema = SchemaFactory.createForClass(User)
