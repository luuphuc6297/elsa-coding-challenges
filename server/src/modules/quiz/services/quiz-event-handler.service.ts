import { Injectable } from '@nestjs/common'
import { EVENTS } from 'shared/constants'
import { MetricsService } from 'shared/services/metrics.service'
import { Server as SocketIOServer } from 'socket.io'
import {
    IQuestionEndedEventData,
    ISessionCompletedEventData,
} from '../interfaces/quiz-session.interface'

@Injectable()
export class QuizEventHandlerService {
    constructor(private readonly metricsService: MetricsService) {}

    setServer(server: SocketIOServer) {
        this.server = server
    }

    private server: SocketIOServer

    async handleEvent(event: string, quizId: string, data: any): Promise<void> {
        const startTime = Date.now()
        try {
            console.log('Handling quiz event:', { event, quizId, data })

            switch (event) {
                case EVENTS.SCORE_UPDATE:
                    await this.handleScoreUpdate(quizId, data)
                    break
                case EVENTS.LEADERBOARD_UPDATE:
                    await this.handleLeaderboardUpdate(quizId, data)
                    break
                case EVENTS.SESSION_EVENT:
                    await this.handleSessionEvent(quizId, data)
                    break
                case EVENTS.QUESTION_STARTED:
                    await this.handleQuestionStarted(quizId, data)
                    break
                case EVENTS.QUESTION_ENDED:
                    await this.handleQuestionEnded(quizId, data)
                    break
                case EVENTS.SESSION_COMPLETED:
                    await this.handleSessionCompleted(quizId, data)
                    break
                default:
                    console.warn('Unhandled event type:', event)
            }
        } catch (error) {
            console.error('Error handling quiz event:', error)
            throw error
        } finally {
            const duration = Date.now() - startTime
            await this.metricsService.trackLatency('quiz_event_handling', duration)
        }
    }

    private async handleScoreUpdate(quizId: string, data: any): Promise<void> {
        console.log('Broadcasting SCORE_UPDATE to room:', quizId)
        this.server.to(quizId).emit(EVENTS.SCORE_UPDATE, data)
    }

    private async handleLeaderboardUpdate(quizId: string, data: any): Promise<void> {
        console.log('Broadcasting LEADERBOARD_UPDATE to room:', quizId)
        this.server.to(quizId).emit(EVENTS.LEADERBOARD_UPDATE, data)
    }

    private async handleSessionEvent(quizId: string, data: any): Promise<void> {
        console.log('Broadcasting SESSION_EVENT to room:', quizId, data)
        this.server.to(quizId).emit(EVENTS.SESSION_EVENT, data)
    }

    private async handleQuestionStarted(quizId: string, data: any): Promise<void> {
        console.log('Broadcasting QUESTION_STARTED to room:', quizId)
        this.server.to(quizId).emit(EVENTS.QUESTION_STARTED, data)
    }

    private async handleQuestionEnded(
        quizId: string,
        data: IQuestionEndedEventData
    ): Promise<void> {
        console.log('Broadcasting QUESTION_ENDED to room:', quizId)
        this.server.to(quizId).emit(EVENTS.SESSION_EVENT, {
            type: EVENTS.QUESTION_ENDED,
            data,
        })
    }

    private async handleSessionCompleted(
        quizId: string,
        data: ISessionCompletedEventData
    ): Promise<void> {
        console.log('Broadcasting SESSION_COMPLETED to room:', quizId)
        this.server.to(quizId).emit(EVENTS.SESSION_EVENT, {
            type: EVENTS.SESSION_COMPLETED,
            data,
        })
    }
}
