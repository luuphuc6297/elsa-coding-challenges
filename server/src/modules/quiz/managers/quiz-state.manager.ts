import { Injectable } from '@nestjs/common'
import { Types } from 'mongoose'
import {
    IParticipant,
    IQuestionState,
    IQuizSession,
    ParticipantStatus,
    QuizSessionStatus,
} from '../interfaces/quiz.interface'

@Injectable()
export class QuizStateManager {
    private sessions: Map<
        string,
        {
            status: QuizSessionStatus
            participants: Map<string, IParticipant>
            currentQuestion: IQuestionState | null
            questionTimer: NodeJS.Timeout | null
            startTime: number
            endTime?: number
        }
    > = new Map()

    getState(quizId: string): IQuizSession | undefined {
        const session = this.sessions.get(quizId)
        if (!session) return undefined

        return {
            quizId,
            sessionId: quizId,
            status: QuizSessionStatus.WAITING,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined,
            currentQuestionIndex: 0,
            participants: Array.from(session.participants.values()),
            submittedAnswers: new Map()
        }
    }

    createSession(quizId: string): void {
        this.sessions.set(quizId, {
            status: QuizSessionStatus.WAITING,
            participants: new Map(),
            currentQuestion: null,
            questionTimer: null,
            startTime: Date.now(),
        })
    }

    addParticipant(quizId: string, participant: IParticipant): void {
        const session = this.sessions.get(quizId)
        if (!session) {
            throw new Error('Session not found')
        }
        session.participants.set(participant.userId.toString(), participant)
    }

    startQuestion(quizId: string, questionId: string, timeLimit: number): void {
        const session = this.sessions.get(quizId)
        if (!session) {
            throw new Error('Session not found')
        }

        session.currentQuestion = {
            questionId,
            startTime: Date.now(),
            submittedAnswers: new Map(),
            timeLimit,
        }

        // Clear existing timer if any
        if (session.questionTimer) {
            clearTimeout(session.questionTimer)
        }
    }

    submitAnswer(quizId: string, userId: string, answer: string, points: number): void {
        const session = this.sessions.get(quizId)
        if (!session || !session.currentQuestion) {
            throw new Error('Invalid session state')
        }

        const timeSpent = Date.now() - session.currentQuestion.startTime
        session.currentQuestion.submittedAnswers.set(userId, {
            answer,
            timeSpent,
            points,
        })

        // Update participant score
        const participant = session.participants.get(userId)
        if (participant) {
            participant.score += points
            if (points > 0) {
                participant.correctAnswers += 1
            }
            participant.timeSpent += timeSpent
            participant.lastActive = Date.now()
        }
    }

    getParticipantScore(quizId: string, userId: string | Types.ObjectId): number {
        const session = this.sessions.get(quizId)
        if (!session) {
            throw new Error('Session not found')
        }
        const userIdStr = typeof userId === 'string' ? userId : userId.toString()
        return session.participants.get(userIdStr)?.score || 0
    }

    updateParticipantStatus(
        quizId: string,
        userId: string | Types.ObjectId,
        status: ParticipantStatus
    ): void {
        const session = this.sessions.get(quizId)
        if (!session) {
            throw new Error('Session not found')
        }
        const userIdStr = typeof userId === 'string' ? userId : userId.toString()
        const participant = session.participants.get(userIdStr)
        if (participant) {
            participant.status = status
            participant.lastActive = Date.now()
        }
    }

    getLeaderboard(quizId: string): IParticipant[] {
        const session = this.sessions.get(quizId)
        if (!session) {
            throw new Error('Session not found')
        }

        return Array.from(session.participants.values()).sort((a, b) => b.score - a.score)
    }

    getAllParticipantIds(quizId: string): string[] {
        const session = this.sessions.get(quizId)
        if (!session) {
            throw new Error('Session not found')
        }
        return Array.from(session.participants.keys())
    }

    haveAllParticipantsAnswered(quizId: string): boolean {
        const session = this.sessions.get(quizId)
        if (!session || !session.currentQuestion) {
            return false
        }

        const activeParticipants = Array.from(session.participants.values()).filter(
            (p) => p.status === ParticipantStatus.TAKING
        )

        return activeParticipants.every((p) =>
            session.currentQuestion?.submittedAnswers.has(p.userId.toString())
        )
    }

    hasSubmittedAnswer(quizId: string, userId: string | Types.ObjectId): boolean {
        const session = this.sessions.get(quizId)
        if (!session || !session.currentQuestion) {
            return false
        }
        const userIdStr = typeof userId === 'string' ? userId : userId.toString()
        return session.currentQuestion.submittedAnswers.has(userIdStr)
    }

    clearQuestionTimer(quizId: string): void {
        const session = this.sessions.get(quizId)
        if (session?.questionTimer) {
            clearTimeout(session.questionTimer)
            session.questionTimer = null
        }
    }

    endSession(quizId: string): void {
        const session = this.sessions.get(quizId)
        if (session) {
            this.clearQuestionTimer(quizId)
            session.status = QuizSessionStatus.COMPLETED
            session.endTime = Date.now()
        }
    }
}
