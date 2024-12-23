import type { Answer, LeaderboardEntry, Question, Quiz } from '@/types'
import { create } from 'zustand'

interface QuizState {
    currentQuiz: Quiz | null
    currentQuestion: Question | null
    answers: Answer[]
    participants: { userId: string; username: string }[]
    leaderboard: LeaderboardEntry[]
    isLoading: boolean
    error: string | null
    timeRemaining: number
    isSessionStarted: boolean

    setCurrentQuiz: (quiz: Quiz | null) => void
    setCurrentQuestion: (question: Question | null) => void
    addAnswer: (answer: Answer) => void
    setParticipants: (participants: { userId: string; username: string }[]) => void
    setLeaderboard: (leaderboard: LeaderboardEntry[]) => void
    setTimeRemaining: (time: number) => void
    setSessionStarted: (started: boolean) => void
    resetQuizState: () => void
    setError: (error: string | null) => void
    setLoading: (loading: boolean) => void
}

const initialState = {
    currentQuiz: null,
    currentQuestion: null,
    answers: [],
    participants: [],
    leaderboard: [],
    isLoading: false,
    error: null,
    timeRemaining: 0,
    isSessionStarted: false,
}

export const useQuizStore = create<QuizState>((set) => ({
    ...initialState,

    setCurrentQuiz: (quiz) => set({ currentQuiz: quiz }),
    
    setCurrentQuestion: (question) => set({ currentQuestion: question }),

    addAnswer: (answer) =>
        set((state) => ({
            answers: [...state.answers, answer],
        })),

    setParticipants: (participants) => set({ participants }),

    setLeaderboard: (leaderboard) => set({ leaderboard }),

    setTimeRemaining: (time) => set({ timeRemaining: time }),

    setSessionStarted: (started) => set({ isSessionStarted: started }),

    resetQuizState: () => set(initialState),

    setError: (error) => set({ error }),

    setLoading: (loading) => set({ isLoading: loading }),
}))
