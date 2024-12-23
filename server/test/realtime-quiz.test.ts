import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import { EVENTS } from '../src/shared/constants'

describe('Real-time Quiz Tests', () => {
    let socket1: Socket // Player 1
    let socket2: Socket // Player 2
    let quizId: string
    let token1: string
    let token2: string
    let userId1: string
    let userId2: string

    const API_URL = 'http://localhost:3000'
    const WS_URL = 'http://localhost:3000/quiz'

    beforeAll(async () => {
        // Login 2 users
        const loginResponse1 = await axios.post(`${API_URL}/auth/login`, {
            email: 'user1@example.com',
            password: 'password123',
        })
        token1 = loginResponse1.data.access_token
        userId1 = loginResponse1.data.user.id

        const loginResponse2 = await axios.post(`${API_URL}/auth/login`, {
            email: 'user2@example.com',
            password: 'password123',
        })
        token2 = loginResponse2.data.access_token
        userId2 = loginResponse2.data.user.id

        // Get an active quiz
        const quizResponse = await axios.get(`${API_URL}/quiz`, {
            headers: { Authorization: `Bearer ${token1}` },
        })
        quizId = quizResponse.data[0].quizId

        // Connect WebSocket clients
        socket1 = io(WS_URL, {
            auth: { token: token1 },
            transports: ['websocket'],
        })

        socket2 = io(WS_URL, {
            auth: { token: token2 },
            transports: ['websocket'],
        })

        await new Promise<void>((resolve) => {
            socket1.on('connect', () => resolve())
        })
        await new Promise<void>((resolve) => {
            socket2.on('connect', () => resolve())
        })
    })

    afterAll(() => {
        socket1.close()
        socket2.close()
    })

    test('Players can join quiz', (done) => {
        let joinedCount = 0
        const expectedPlayers = 2

        const checkDone = () => {
            joinedCount++
            if (joinedCount === expectedPlayers) {
                done()
            }
        }

        socket1.emit(EVENTS.JOIN_QUIZ, { quizId, userId: userId1 })
        socket1.once(EVENTS.JOIN_QUIZ, (response) => {
            expect(response.success).toBe(true)
            expect(response.data.session).toBeDefined()
            expect(response.data.leaderboard).toBeDefined()
            checkDone()
        })

        socket2.emit(EVENTS.JOIN_QUIZ, { quizId, userId: userId2 })
        socket2.once(EVENTS.JOIN_QUIZ, (response) => {
            expect(response.success).toBe(true)
            expect(response.data.session).toBeDefined()
            expect(response.data.leaderboard).toBeDefined()
            checkDone()
        })
    })

    test('Players can submit answers and receive score updates', (done) => {
        let updatesReceived = 0
        const expectedUpdates = 2

        const checkDone = () => {
            updatesReceived++
            if (updatesReceived === expectedUpdates) {
                done()
            }
        }

        // Listen for score updates
        socket1.on(EVENTS.SCORE_UPDATE, (data) => {
            expect(data.userId).toBeDefined()
            expect(data.score).toBeDefined()
            expect(data.isCorrect).toBeDefined()
            checkDone()
        })

        socket2.on(EVENTS.SCORE_UPDATE, (data) => {
            expect(data.userId).toBeDefined()
            expect(data.score).toBeDefined()
            expect(data.isCorrect).toBeDefined()
            checkDone()
        })

        // Submit answers
        socket1.emit(EVENTS.SUBMIT_ANSWER, {
            quizId,
            questionId: '1',
            answer: 'Option A',
            userId: userId1,
        })

        socket2.emit(EVENTS.SUBMIT_ANSWER, {
            quizId,
            questionId: '1',
            answer: 'Option B',
            userId: userId2,
        })
    })

    test('Leaderboard updates are broadcasted', (done) => {
        let updatesReceived = 0
        const expectedUpdates = 2

        const checkDone = () => {
            updatesReceived++
            if (updatesReceived === expectedUpdates) {
                done()
            }
        }

        socket1.on(EVENTS.LEADERBOARD_UPDATE, (data) => {
            expect(data.leaderboard).toBeDefined()
            expect(Array.isArray(data.leaderboard)).toBe(true)
            checkDone()
        })

        socket2.on(EVENTS.LEADERBOARD_UPDATE, (data) => {
            expect(data.leaderboard).toBeDefined()
            expect(Array.isArray(data.leaderboard)).toBe(true)
            checkDone()
        })

        // Trigger leaderboard update by submitting answers
        socket1.emit(EVENTS.SUBMIT_ANSWER, {
            quizId,
            questionId: '2',
            answer: 'Option A',
            userId: userId1,
        })

        socket2.emit(EVENTS.SUBMIT_ANSWER, {
            quizId,
            questionId: '2',
            answer: 'Option B',
            userId: userId2,
        })
    })
})
