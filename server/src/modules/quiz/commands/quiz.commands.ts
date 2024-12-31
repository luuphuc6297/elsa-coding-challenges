import { LeaderboardService } from 'modules/leaderboard/services/leaderboard.service'
import { EVENTS } from 'shared/constants'
import { MetricsService } from 'shared/services/metrics.service'
import { Socket } from 'socket.io'
import { IQuestionStartedEventData, IQuizSession } from '../interfaces/quiz.interface'
import { QuizStateManager } from '../managers/quiz-state.manager'
import { QuizSessionService } from '../services/quiz-session.service'
import { QuizService } from '../services/quiz.service'

// Command Interface
export interface QuizCommand {
    execute(): Promise<any>
}

// Start Quiz Session Command
export class StartQuizSessionCommand implements QuizCommand {
    constructor(
        private readonly quizId: string,
        private readonly userId: string,
        private readonly quizSessionService: QuizSessionService,
        private readonly quizService: QuizService,
        private readonly metricsService: MetricsService
    ) {}

    async execute(): Promise<IQuizSession> {
        const startTime = Date.now()
        try {
            const activeSession = await this.quizSessionService.findActiveSession(this.quizId)
            if (activeSession) {
                return activeSession as unknown as IQuizSession
            }

            const quiz = await this.quizService.findById(this.quizId)
            if (!quiz) {
                throw new Error(`Quiz not found with id: ${this.quizId}`)
            }

            const { session } = await this.quizSessionService.startQuizSession(
                this.quizId,
                this.userId
            )
            await this.metricsService.trackLatency('start_quiz_session', Date.now() - startTime)
            return session as unknown as IQuizSession
        } catch (error) {
            await this.metricsService.trackError('start_quiz_session', error.message)
            throw error
        }
    }
}

// Join Quiz Command
export class JoinQuizCommand implements QuizCommand {
    constructor(
        private readonly session: IQuizSession,
        private readonly client: Socket,
        private readonly leaderboardService: LeaderboardService,
        private readonly quizEventSubject: any,
        private readonly metricsService: MetricsService
    ) {}

    async execute(): Promise<void> {
        const startTime = Date.now()
        try {
            const user = this.client['user']

            await this.client.join(this.session.quizId)

            await this.leaderboardService.addParticipant(this.session.quizId, {
                userId: user.sub,
                username: user.username,
                score: 0,
                correctAnswers: 0,
                timeSpent: 0,
            })

            await this.quizEventSubject.notify(EVENTS.JOIN_QUIZ, this.session.quizId, {
                userId: user.sub,
                username: user.username,
            })

            await this.metricsService.trackLatency('join_quiz', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('join_quiz', error.message)
            throw error
        }
    }
}

// Start Question Command
export class StartQuestionCommand implements QuizCommand {
    constructor(
        private readonly session: IQuizSession,
        private readonly quizService: QuizService,
        private readonly quizStateManager: QuizStateManager,
        private readonly quizEventSubject: any,
        private readonly metricsService: MetricsService
    ) {}

    async execute(): Promise<IQuestionStartedEventData> {
        const startTime = Date.now()
        try {
            const quiz = await this.quizService.findById(this.session.quizId)
            if (!quiz || !quiz.questions.length) {
                throw new Error(`Quiz not found or has no questions: ${this.session.quizId}`)
            }

            const firstQuestion = quiz.questions[0]
            const quizState = this.quizStateManager.getState(this.session.quizId)

            quizState.currentQuestionIndex = 0
            quizState.questionStartTime = Date.now()
            quizState.submittedAnswers.clear()

            const questionData: IQuestionStartedEventData = {
                question: {
                    questionId: firstQuestion.questionId,
                    content: firstQuestion.content,
                    options: firstQuestion.options,
                    timeLimit: firstQuestion.timeLimit,
                    points: firstQuestion.points,
                },
                timeLimit: firstQuestion.timeLimit,
                questionIndex: 1,
                totalQuestions: quiz.questions.length,
                startTime: quizState.questionStartTime,
            }

            await this.quizEventSubject.notify(
                EVENTS.QUESTION_STARTED,
                this.session.quizId,
                questionData
            )
            await this.metricsService.trackLatency('start_question', Date.now() - startTime)

            return questionData
        } catch (error) {
            await this.metricsService.trackError('start_question', error.message)
            throw error
        }
    }
}
