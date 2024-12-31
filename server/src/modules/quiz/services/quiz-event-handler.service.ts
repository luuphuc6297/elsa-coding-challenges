import { Injectable } from '@nestjs/common'
import { EVENTS } from 'shared/constants'
import { Server } from 'socket.io'
import { ILeaderboardEntry, IParticipant, ParticipantStatus } from '../interfaces/quiz.interface'
import { QuizStateManager } from '../managers/quiz-state.manager'

@Injectable()
export class QuizEventHandlerService {
    constructor(private readonly quizStateManager: QuizStateManager) {}

    handleParticipantJoined(server: Server, quizId: string, participant: IParticipant): void {
        // Update participant status
        this.quizStateManager.updateParticipantStatus(
            quizId,
            participant.userId.toString(),
            ParticipantStatus.ONLINE
        )

        // Notify all participants
        server.to(quizId).emit(EVENTS.SESSION_EVENT, {
            type: EVENTS.PARTICIPANT_JOINED,
            data: participant,
        })
    }

    handleParticipantLeft(server: Server, quizId: string, userId: string): void {
        // Update participant status
        this.quizStateManager.updateParticipantStatus(quizId, userId, ParticipantStatus.OFFLINE)

        // Notify all participants
        server.to(quizId).emit(EVENTS.SESSION_EVENT, {
            type: EVENTS.PARTICIPANT_LEFT,
            data: { userId },
        })
    }

    handleLeaderboardUpdate(
        server: Server,
        quizId: string,
        leaderboard: ILeaderboardEntry[]
    ): void {
        server.to(quizId).emit(EVENTS.LEADERBOARD_UPDATE, leaderboard)
    }

    handleQuestionTimeout(server: Server, quizId: string, correctAnswer: string): void {
        server.to(quizId).emit(EVENTS.QUESTION_TIMEOUT, {
            correctAnswer,
            leaderboard: this.quizStateManager.getLeaderboard(quizId),
        })
    }

    handleQuizCompleted(server: Server, quizId: string): void {
        const leaderboard = this.quizStateManager.getLeaderboard(quizId)
        server.to(quizId).emit(EVENTS.QUIZ_COMPLETED, { leaderboard })
    }

    handleNextQuestion(server: Server, quizId: string, question: any, timeLimit: number): void {
        server.to(quizId).emit(EVENTS.NEXT_QUESTION, {
            question,
            timeLimit,
        })
    }
}
