import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

@Schema()
class LeaderboardEntry {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId

    @Prop({ required: true })
    username: string

    @Prop({ default: 0 })
    score: number

    @Prop({ default: 0 })
    timeSpent: number

    @Prop({ default: 0 })
    correctAnswers: number

    @Prop({ default: Date.now })
    lastUpdated: Date
}

@Schema({ timestamps: true })
export class Leaderboard extends Document {
    @Prop({ required: true })
    quizId: string

    @Prop({ required: true })
    sessionId: string

    @Prop({ type: [LeaderboardEntry], default: [] })
    entries: LeaderboardEntry[]

    @Prop({ default: Date.now })
    lastCalculated: Date

    @Prop({
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
    })
    status: string
}

export const LeaderboardSchema = SchemaFactory.createForClass(Leaderboard)
