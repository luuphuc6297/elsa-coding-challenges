import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import { Model } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { Leaderboard } from '../../modules/leaderboard/entities/leaderboard.entity'
import { Quiz } from '../../modules/quiz/entities/quiz.entity'
import { User } from '../../modules/user/entities/user.entity'

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name)

    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
        @InjectModel(Leaderboard.name) private leaderboardModel: Model<Leaderboard>
    ) {}

    async seed() {
        try {
            this.logger.log('Cleaning database...')
            await this.cleanDatabase()

            this.logger.log('Seeding users...')
            const users = await this.seedUsers()
            this.logger.log(`Created ${users.length} users`)

            this.logger.log('Seeding quizzes...')
            const quizzes = await this.seedQuizzes()
            this.logger.log(`Created ${quizzes.length} quizzes`)

            this.logger.log('Seeding leaderboards...')
            await this.seedLeaderboards(users, quizzes)
            this.logger.log('Seed completed')

            return { users, quizzes }
        } catch (error) {
            this.logger.error('Seed failed:', error)
            throw error
        }
    }

    private async cleanDatabase() {
        await this.userModel.deleteMany({})
        await this.quizModel.deleteMany({})
        await this.leaderboardModel.deleteMany({})
    }

    private async seedUsers() {
        const users = []
        const hashedPassword = await bcrypt.hash('password123', 10)

        for (let i = 1; i <= 20; i++) {
            const user = new this.userModel({
                username: `user${i}`,
                email: `user${i}@example.com`,
                password: hashedPassword,
                fullName: `Test User ${i}`,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
                totalScore: Math.floor(Math.random() * 1000),
                quizzesTaken: Math.floor(Math.random() * 20),
                isVerified: true,
                lastLogin: new Date(),
                role: i === 1 ? 'admin' : 'user',
            })
            users.push(await user.save())
        }
        return users
    }

    private async seedQuizzes() {
        const quizzes = []
        const vocabularyCategories = [
            'Basic English',
            'Business English',
            'TOEIC',
            'IELTS',
            'Academic English',
        ]

        // Get first user as default host
        const host = await this.userModel.findOne().exec()
        if (!host) {
            throw new Error('No users found to assign as quiz host')
        }

        for (let i = 1; i <= 20; i++) {
            const category =
                vocabularyCategories[Math.floor(Math.random() * vocabularyCategories.length)]
            const quiz = new this.quizModel({
                quizId: uuidv4(),
                title: `${category} Vocabulary Quiz ${i}`,
                description: `Test your ${category} vocabulary knowledge`,
                hostId: host._id.toString(),
                questions: this.generateVocabularyQuestions(category),
                isActive: true,
                duration: 15, // 15 minutes
                maxParticipants: 50,
                visibility: 'public',
                startTime: new Date(),
                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            quizzes.push(await quiz.save())
        }

        // Add more vocabulary
        const basicVocab = await this.quizModel.create({
            title: 'Basic English Vocabulary',
            description: 'Test your knowledge of basic English words',
            category: 'vocabulary',
            difficulty: 'beginner',
            timeLimit: 600,
            questions: this.generateVocabularyQuestions('Basic English'),
            hostId: host._id,
            isPublic: true,
        })

        // Add business vocabulary
        const businessVocab = await this.quizModel.create({
            title: 'Business English',
            description: 'Essential vocabulary for business communication',
            category: 'business',
            difficulty: 'intermediate',
            timeLimit: 600,
            questions: this.generateVocabularyQuestions('Business English'),
            hostId: host._id,
            isPublic: true,
        })

        // Add TOEIC vocabulary
        const toeicVocab = await this.quizModel.create({
            title: 'TOEIC Vocabulary',
            description: 'Common words appearing in TOEIC tests',
            category: 'exam',
            difficulty: 'intermediate',
            timeLimit: 600,
            questions: this.generateVocabularyQuestions('TOEIC'),
            hostId: host._id,
            isPublic: true,
        })

        // Add IELTS vocabulary
        const ieltsVocab = await this.quizModel.create({
            title: 'IELTS Academic Vocabulary',
            description: 'Essential words for IELTS Academic',
            category: 'exam',
            difficulty: 'advanced',
            timeLimit: 600,
            questions: this.generateVocabularyQuestions('IELTS'),
            hostId: host._id,
            isPublic: true,
        })

        // Add academic vocabulary
        const academicVocab = await this.quizModel.create({
            title: 'Academic English',
            description: 'Vocabulary for academic writing and research',
            category: 'academic',
            difficulty: 'advanced',
            timeLimit: 600,
            questions: this.generateVocabularyQuestions('Academic English'),
            hostId: host._id,
            isPublic: true,
        })

        quizzes.push(basicVocab, businessVocab, toeicVocab, ieltsVocab, academicVocab)

        return quizzes
    }

    private generateVocabularyQuestions(category: string) {
        const questions = []
        const questionCount = 10 // Fixed 10 questions per quiz

        const vocabularyQuestions = {
            'Basic English': [
                {
                    word: 'Abundant',
                    options: ['Plentiful', 'Scarce', 'Limited', 'Rare'],
                    correct: 'Plentiful',
                },
                {
                    word: 'Concise',
                    options: ['Brief', 'Long', 'Detailed', 'Complex'],
                    correct: 'Brief',
                },
                // ... thêm nhiều từ vựng khác
            ],
            'Business English': [
                {
                    word: 'Revenue',
                    options: ['Income', 'Expense', 'Loss', 'Debt'],
                    correct: 'Income',
                },
                {
                    word: 'Negotiate',
                    options: ['Discuss terms', 'Avoid', 'Reject', 'Accept'],
                    correct: 'Discuss terms',
                },
                // ... thêm từ vựng business
            ],
            TOEIC: [
                {
                    word: 'Deadline',
                    options: ['Time limit', 'Schedule', 'Delay', 'Extension'],
                    correct: 'Time limit',
                },
                {
                    word: 'Implement',
                    options: ['Put into action', 'Plan', 'Consider', 'Reject'],
                    correct: 'Put into action',
                },
                // ... thêm từ vựng TOEIC
            ],
            IELTS: [
                {
                    word: 'Controversial',
                    options: ['Debatable', 'Accepted', 'Clear', 'Simple'],
                    correct: 'Debatable',
                },
                {
                    word: 'Phenomenon',
                    options: ['Occurrence', 'Theory', 'Belief', 'Opinion'],
                    correct: 'Occurrence',
                },
                // ... thêm từ vựng IELTS
            ],
            'Academic English': [
                {
                    word: 'Hypothesis',
                    options: ['Assumption', 'Conclusion', 'Result', 'Fact'],
                    correct: 'Assumption',
                },
                {
                    word: 'Analysis',
                    options: ['Examination', 'Summary', 'Overview', 'Description'],
                    correct: 'Examination',
                },
                // ... thêm từ vựng academic
            ],
        }

        const categoryQuestions =
            vocabularyQuestions[category] || vocabularyQuestions['Basic English']

        for (let i = 0; i < questionCount; i++) {
            const question = categoryQuestions[i % categoryQuestions.length]
            questions.push({
                questionId: uuidv4(),
                content: `What is the meaning of "${question.word}"?`,
                options: question.options,
                correctAnswer: question.correct,
                points: 10,
                timeLimit: 30, // 30 seconds per question
            })
        }
        return questions
    }

    private async seedLeaderboards(users: User[], quizzes: Quiz[]) {
        for (const quiz of quizzes) {
            const leaderboard = new this.leaderboardModel({
                quizId: quiz.quizId,
                sessionId: uuidv4(),
                entries: this.generateLeaderboardEntries(users, 10),
                status: 'active',
                lastCalculated: new Date(),
            })
            await leaderboard.save()
        }
    }

    private generateLeaderboardEntries(users: User[], count: number) {
        const shuffledUsers = [...users].sort(() => 0.5 - Math.random())
        return shuffledUsers.slice(0, count).map((user, index) => ({
            userId: user._id,
            username: user.username,
            score: Math.floor(Math.random() * 100) * (10 - index),
            timeSpent: Math.floor(Math.random() * 300), // 0-5 minutes
            correctAnswers: Math.floor(Math.random() * 10),
            lastUpdated: new Date(),
        }))
    }
}
