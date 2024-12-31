import { LeaderboardService } from 'modules/leaderboard/services/leaderboard.service'
import { EVENTS } from 'shared/constants'
import { RedisService } from 'shared/services/redis.service'

export interface IQuizEventObserver {
    update(event: string, quizId: string, data: any): Promise<void>
}

export class LeaderboardObserver implements IQuizEventObserver {
    constructor(private readonly leaderboardService: LeaderboardService) {}

    async update(event: string, quizId: string, data: any): Promise<void> {
        if (event === EVENTS.SCORE_UPDATE) {
            await this.leaderboardService.updateLeaderboard({
                quizId,
                userId: data.userId,
                score: data.score,
                timeSpent: data.timeSpent,
                correctAnswers: data.correctAnswers,
            })
        }
    }
}

export class RedisObserver implements IQuizEventObserver {
    constructor(private readonly redisService: RedisService) {}

    async update(event: string, quizId: string, data: any): Promise<void> {
        await this.redisService.publish('quiz_events', {
            event,
            quizId,
            data,
        })
    }
}

export class QuizEventSubject {
    private observers: IQuizEventObserver[] = []

    addObserver(observer: IQuizEventObserver): void {
        this.observers.push(observer)
    }

    removeObserver(observer: IQuizEventObserver): void {
        const index = this.observers.indexOf(observer)
        if (index !== -1) {
            this.observers.splice(index, 1)
        }
    }

    async notify(event: string, quizId: string, data: any): Promise<void> {
        for (const observer of this.observers) {
            await observer.update(event, quizId, data)
        }
    }
}
