import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cache } from 'cache-manager'
import { Model, Types } from 'mongoose'
import { CACHE_KEYS } from 'shared/constants'
import { MetricsService } from 'shared/services/metrics.service'
import { RedisService } from 'shared/services/redis.service'
import { UpdateLeaderboardDto } from '../dtos/update-leaderboard.dto'
import { Leaderboard } from '../entities/leaderboard.entity'

export interface ILeaderboardEntry {
    userId: string
    username: string
    score: number
    correctAnswers: number
    timeSpent: number
}

@Injectable()
export class LeaderboardService {
    constructor(
        @InjectModel(Leaderboard.name) private leaderboardModel: Model<Leaderboard>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly redisService: RedisService,
        private readonly metricsService: MetricsService
    ) {}

    async createLeaderboard(quizId: string, sessionId: string): Promise<Leaderboard> {
        const leaderboard = new this.leaderboardModel({
            quizId,
            sessionId,
            entries: [],
        })
        return await leaderboard.save()
    }

    async updateLeaderboard(dto: UpdateLeaderboardDto) {
        const cacheKey = `${CACHE_KEYS.LEADERBOARD}${dto.quizId}`

        const leaderboard = await this.leaderboardModel.findOne({
            quizId: dto.quizId,
            status: 'active',
        })

        if (!leaderboard) {
            throw new NotFoundException('Leaderboard not found')
        }

        // Update or add new entry
        const entryIndex = leaderboard.entries.findIndex(
            (entry) => entry.userId.toString() === dto.userId
        )

        if (entryIndex > -1) {
            leaderboard.entries[entryIndex].score = dto.score
            leaderboard.entries[entryIndex].timeSpent = dto.timeSpent
            leaderboard.entries[entryIndex].lastUpdated = new Date()
        } else {
            leaderboard.entries.push({
                userId: new Types.ObjectId(dto.userId),
                username: dto.username,
                score: dto.score,
                timeSpent: dto.timeSpent,
                correctAnswers: dto.correctAnswers,
                lastUpdated: new Date(),
            })
        }

        // Sort entries by score (descending) and time spent (ascending)
        leaderboard.entries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score
            }
            return a.timeSpent - b.timeSpent
        })

        leaderboard.lastCalculated = new Date()
        await leaderboard.save()

        // Update cache
        await this.cacheManager.set(cacheKey, leaderboard.entries, 60000) // Cache for 1 minute

        return leaderboard.entries
    }

    async getLeaderboard(quizId: string): Promise<ILeaderboardEntry[]> {
        const key = `leaderboard:${quizId}`
        const startTime = Date.now()

        try {
            const entries = await this.redisService.hGetAll(key)
            const leaderboard = Object.entries(entries).map(([userId, data]) => {
                const parsed = JSON.parse(data)
                return {
                    userId,
                    username: parsed.username,
                    score: parsed.score,
                    correctAnswers: parsed.correctAnswers,
                    timeSpent: parsed.timeSpent,
                }
            })

            await this.metricsService.trackLatency('get_leaderboard', Date.now() - startTime)
            return leaderboard
        } catch (error) {
            await this.metricsService.trackError('get_leaderboard', error.message)
            throw error
        }
    }

    async archiveLeaderboard(quizId: string) {
        const leaderboard = await this.leaderboardModel.findOne({
            quizId,
            status: 'active',
        })

        if (!leaderboard) {
            throw new NotFoundException('Leaderboard not found')
        }

        leaderboard.status = 'archived'
        await leaderboard.save()

        // Clear cache
        const cacheKey = `${CACHE_KEYS.LEADERBOARD}${quizId}`
        await this.cacheManager.del(cacheKey)

        return leaderboard
    }

    async getTopPlayers(quizId: string, limit: number = 10): Promise<any[]> {
        const cacheKey = `${CACHE_KEYS.TOP_PLAYERS}${quizId}`

        // Try to get from cache
        let topPlayers: any[] = (await this.cacheManager.get(cacheKey)) || []

        if (!topPlayers) {
            // If not in cache, get from database
            topPlayers = await this.leaderboardModel.aggregate([
                { $match: { quizId, status: 'active' } },
                { $unwind: '$entries' },
                { $sort: { 'entries.score': -1 } },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        userId: '$entries.userId',
                        username: '$entries.username',
                        score: '$entries.score',
                    },
                },
            ])

            // Cache the results
            await this.cacheManager.set(cacheKey, topPlayers, 30000) // 30 seconds
        }

        return topPlayers
    }

    async addParticipant(
        quizId: string,
        participant: {
            userId: string
            username: string
            score: number
            correctAnswers: number
            timeSpent: number
        }
    ): Promise<void> {
        const key = `leaderboard:${quizId}`
        const startTime = Date.now()

        try {
            await this.redisService.hSet(
                key,
                participant.userId,
                JSON.stringify({
                    username: participant.username,
                    score: participant.score,
                    correctAnswers: participant.correctAnswers,
                    timeSpent: participant.timeSpent,
                })
            )

            await this.metricsService.trackLatency(
                'add_participant_leaderboard',
                Date.now() - startTime
            )
        } catch (error) {
            await this.metricsService.trackError('add_participant_leaderboard', error.message)
            throw error
        }
    }
}
