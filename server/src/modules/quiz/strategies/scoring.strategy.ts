export interface IScoringStrategy {
    calculatePoints(timeSpent: number, maxTime: number, basePoints: number): number
}

export class TimeBasedScoringStrategy implements IScoringStrategy {
    calculatePoints(timeSpent: number, maxTime: number, basePoints: number): number {
        // Calculate time ratio (0 to 1)
        const timeRatio = Math.max(0, 1 - timeSpent / maxTime)

        // Apply scoring formula:
        // - If answered immediately (timeRatio = 1): get full points
        // - If answered at last second (timeRatio ≈ 0): get minimum points (20% of base points)
        const minPointsRatio = 0.2
        const pointsRatio = minPointsRatio + (1 - minPointsRatio) * timeRatio

        // Round to nearest integer
        return Math.round(basePoints * pointsRatio)
    }
}

export class BonusPointsScoringStrategy implements IScoringStrategy {
    private readonly bonusThreshold = 0.3 // 30% of time remaining
    private readonly bonusMultiplier = 1.5

    calculatePoints(timeSpent: number, maxTime: number, basePoints: number): number {
        const timeRatio = Math.max(0, 1 - timeSpent / maxTime)
        const baseScore = Math.round(basePoints * timeRatio)

        // Apply bonus points if answered within first 30% of time
        if (timeRatio > 1 - this.bonusThreshold) {
            return Math.round(baseScore * this.bonusMultiplier)
        }

        return baseScore
    }
}
