import { env } from '@/lib/env'
import type {
    AuthResponse,
    BaseResponse,
    Leaderboard,
    LeaderboardEntry,
    Quiz,
    QuizSession,
    User,
} from '@/types'
import axios from 'axios'

// Base API instance
const createAPI = (prefix?: string) => {
    const instance = axios.create({
        baseURL: env.NEXT_PUBLIC_API_URL, // Server URL
        headers: {
            'Content-Type': 'application/json',
        },
        withCredentials: true,
    })

    console.log('env.NEXT_PUBLIC_API_URL', env.NEXT_PUBLIC_API_URL)

    // Request interceptor
    instance.interceptors.request.use((config) => {
        const token =
            document.cookie
                .split('; ')
                .find((row) => row.startsWith('token='))
                ?.split('=')[1] || localStorage.getItem('token')

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Thêm prefix vào URL nếu có
        if (prefix && !config.url?.startsWith(prefix)) {
            config.url = `${prefix}${config.url}`
        }

        return config
    })

    // Response interceptor
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
                localStorage.removeItem('token')
                window.location.href = '/login'
            }
            return Promise.reject(error)
        }
    )

    return instance
}

// Create separate API instances
const api = createAPI()
const quizApi = createAPI('/quiz')
const authApi = createAPI('/auth')
const userApi = createAPI('/users')
const leaderboardApi = createAPI('/leaderboard')

export const authAPI = {
    login: async (
        email: string,
        password: string
    ): Promise<BaseResponse<{ token: string; user: User }>> => {
        try {
            console.log('Sending login request with:', { email })
            const response = await authApi.post<AuthResponse>('/login', { email, password })
            console.log('Login API response:', {
                status: response.status,
                data: response.data,
                headers: response.headers,
            })

            return {
                success: true,
                data: {
                    token: response.data.access_token,
                    user: {
                        _id: response.data.user.id,
                        email: response.data.user.email,
                        username: response.data.user.username,
                        totalScore: 0,
                        quizzesTaken: 0,
                        quizHistory: [],
                        achievements: [],
                        isVerified: true,
                        isActive: true,
                        role: 'user',
                    },
                },
            }
        } catch (error) {
            console.error('Login API error:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                response: axios.isAxiosError(error) ? error.response?.data : null,
                status: axios.isAxiosError(error) ? error.response?.status : null,
            })
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.message || 'Login failed')
            }
            throw error
        }
    },

    register: async (data: {
        email: string
        password: string
        username: string
        fullName?: string
    }): Promise<BaseResponse<{ token: string; user: User }>> => {
        const response = await authApi.post('/register', data)
        return response.data
    },
}

export const quizAPI = {
    getAllQuizzes: async (): Promise<BaseResponse<Quiz[]>> => {
        try {
            const response = await quizApi.get('')
            return {
                success: true,
                data: response.data, // API trả về trực tiếp array của quizzes
            }
        } catch (error) {
            console.error('Get all quizzes error:', error)
            return {
                success: false,
                error: 'Failed to fetch quizzes',
            }
        }
    },

    getQuizById: async (quizId: string): Promise<BaseResponse<Quiz>> => {
        try {
            console.log('Fetching quiz with ID:', quizId)
            console.log('API URL:', env.NEXT_PUBLIC_API_URL)
            const response = await quizApi.get(`/${quizId}`)
            console.log('Quiz API response:', response.data)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            console.error('Get quiz by ID error:', {
                error,
                status: axios.isAxiosError(error) ? error.response?.status : null,
                data: axios.isAxiosError(error) ? error.response?.data : null,
            })
            throw error
        }
    },

    getDashboard: async (): Promise<
        BaseResponse<{
            totalQuizzes: number
            completedQuizzes: number
            activeQuizzes: Quiz[]
        }>
    > => {
        try {
            const [allQuizzes, userQuizzes] = await Promise.all([
                quizApi.get(''),
                quizApi.get('/my-quizzes'),
            ])

            return {
                success: true,
                data: {
                    totalQuizzes: allQuizzes.data.length,
                    completedQuizzes: userQuizzes.data.filter((q: Quiz) => !q.isActive).length,
                    activeQuizzes: allQuizzes.data.filter((q: Quiz) => q.isActive),
                },
            }
        } catch (error) {
            console.error('Get dashboard error:', error)
            return {
                success: false,
                error: 'Failed to fetch dashboard data',
            }
        }
    },

    createQuiz: async (quizData: Partial<Quiz>): Promise<BaseResponse<Quiz>> => {
        try {
            const response = await quizApi.post('/', quizData)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            console.error('Create quiz error:', {
                error,
                response: axios.isAxiosError(error) ? error.response?.data : null,
            })
            throw error
        }
    },

    startQuiz: async (quizId: string): Promise<BaseResponse<QuizSession>> => {
        try {
            const response = await quizApi.post(`/${quizId}/start`)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            console.error('Start quiz error:', error)
            throw error
        }
    },

    submitAnswer: async (
        quizId: string,
        data: {
            questionId: string
            answer: string
            timeSpent: number
        }
    ): Promise<BaseResponse<{ isCorrect: boolean; score: number }>> => {
        try {
            const response = await quizApi.post(`/${quizId}/submit`, data)
            return {
                success: true,
                data: response.data,
            }
        } catch (error) {
            console.error('Submit answer error:', error)
            throw error
        }
    },
}

export const userAPI = {
    getUserProfile: async (userId: string): Promise<BaseResponse<User>> => {
        const response = await userApi.get(`/${userId}`)
        return response.data
    },

    updateUserProfile: async (userId: string, data: Partial<User>): Promise<BaseResponse<User>> => {
        const response = await userApi.patch(`/${userId}`, data)
        return response.data
    },

    getQuizHistory: async (
        userId: string
    ): Promise<
        BaseResponse<{
            quizzes: Array<{
                id: string
                score: number
                completedAt: Date
            }>
        }>
    > => {
        const response = await userApi.get(`/${userId}/quiz-history`)
        return response.data
    },
}

export const leaderboardAPI = {
    getLeaderboard: async (quizId: string): Promise<BaseResponse<Leaderboard>> => {
        const response = await leaderboardApi.get(`/${quizId}`)
        return response.data
    },

    getTopPlayers: async (quizId: string): Promise<BaseResponse<LeaderboardEntry[]>> => {
        const response = await leaderboardApi.get(`/${quizId}/top`)
        return response.data
    },
}

export default api
