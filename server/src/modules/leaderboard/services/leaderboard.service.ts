import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Cache } from 'cache-manager'
import { Model, Types } from 'mongoose'
import { CACHE_KEYS } from 'shared/constants'
import { UpdateLeaderboardDto } from '../dtos/update-leaderboard.dto'
import { Leaderboard } from '../entities/leaderboard.entity'

@Injectable()
export class LeaderboardService {
    constructor(
        @InjectModel(Leaderboard.name) private leaderboardModel: Model<Leaderboard>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
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

    async getLeaderboard(quizId: string) {
        const cacheKey = `${CACHE_KEYS.LEADERBOARD}${quizId}`

        // Try to get from cache first
        let entries = await this.cacheManager.get(cacheKey)

        if (!entries) {
            const leaderboard = await this.leaderboardModel
                .findOne({ quizId, status: 'active' })
                .populate('entries.userId', 'username avatar')

            if (!leaderboard) {
                throw new NotFoundException('Leaderboard not found')
            }

            entries = leaderboard.entries
            await this.cacheManager.set(cacheKey, entries, 60000) // Cache for 1 minute
        }

        return entries
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
}
