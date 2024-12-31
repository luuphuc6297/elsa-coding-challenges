export interface IScoringStrategy {
    calculatePoints(
        isCorrect: boolean,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): number
}

export class TimeBasedScoringStrategy implements IScoringStrategy {
    calculatePoints(
        isCorrect: boolean,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): number {
        if (!isCorrect) return 0

        // Time bonus: faster answers get more points
        const timeBonus = Math.max(0, 1 - timeSpent / timeLimit)
        return Math.round(maxPoints * (0.7 + 0.3 * timeBonus))
    }
}

export class BasicScoringStrategy implements IScoringStrategy {
    calculatePoints(
        isCorrect: boolean,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): number {
        return isCorrect ? maxPoints : 0
    }
}

export class ProgressiveScoringStrategy implements IScoringStrategy {
    calculatePoints(
        isCorrect: boolean,
        timeSpent: number,
        timeLimit: number,
        maxPoints: number
    ): number {
        if (!isCorrect) return 0

        // Progressive scoring based on time spent
        const timeRatio = timeSpent / timeLimit
        if (timeRatio <= 0.25) return maxPoints // Full points for very fast answers
        if (timeRatio <= 0.5) return Math.round(maxPoints * 0.8) // 80% points for moderately fast answers
        if (timeRatio <= 0.75) return Math.round(maxPoints * 0.6) // 60% points for average speed
        return Math.round(maxPoints * 0.4) // 40% points for slow answers
    }
}
