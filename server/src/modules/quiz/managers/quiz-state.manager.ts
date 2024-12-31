import { Injectable } from '@nestjs/common'

export interface QuizState {
    currentQuestionIndex: number
    timer: NodeJS.Timeout
    startTime?: number
    questionStartTime?: number
    participants: Set<string>
    submittedAnswers: Set<string>
}

@Injectable()
export class QuizStateManager {
    private states: Map<string, QuizState> = new Map()

    getAllParticipantIds(quizId: string): string[] {
        const state = this.getState(quizId)
        return state ? Array.from(state.participants) : []
    }

    haveAllParticipantsAnswered(quizId: string): boolean {
        const state = this.getState(quizId)
        if (!state) return false
        return (
            state.participants.size > 0 && state.submittedAnswers.size === state.participants.size
        )
    }

    createState(quizId: string): QuizState {
        const state: QuizState = {
            currentQuestionIndex: 0,
            timer: null,
            startTime: Date.now(),
            questionStartTime: null,
            participants: new Set<string>(),
            submittedAnswers: new Set<string>(),
        }
        this.states.set(quizId, state)
        return state
    }

    getState(quizId: string): QuizState | undefined {
        return this.states.get(quizId)
    }

    getOrCreateState(quizId: string): QuizState {
        let state = this.getState(quizId)
        if (!state) {
            state = this.createState(quizId)
        }
        return state
    }

    updateState(quizId: string, updates: Partial<QuizState>): void {
        const state = this.getOrCreateState(quizId)
        Object.assign(state, updates)
        this.states.set(quizId, state)
    }

    deleteState(quizId: string): void {
        this.states.delete(quizId)
    }

    clearTimer(quizId: string): void {
        const state = this.getState(quizId)
        if (state?.timer) {
            clearTimeout(state.timer)
            state.timer = null
            this.states.set(quizId, state)
        }
    }

    setTimer(quizId: string, timer: NodeJS.Timeout): void {
        const state = this.getOrCreateState(quizId)
        this.clearTimer(quizId)
        state.timer = timer
        this.states.set(quizId, state)
    }

    addParticipant(quizId: string, participantId: string): void {
        const state = this.getOrCreateState(quizId)
        state.participants.add(participantId)
        this.states.set(quizId, state)
    }

    removeParticipant(quizId: string, participantId: string): void {
        const state = this.getState(quizId)
        if (state) {
            state.participants.delete(participantId)
            this.states.set(quizId, state)
        }
    }

    addSubmittedAnswer(quizId: string, participantId: string): void {
        const state = this.getOrCreateState(quizId)
        state.submittedAnswers.add(participantId)
        this.states.set(quizId, state)
    }

    hasSubmittedAnswer(quizId: string, participantId: string): boolean {
        const state = this.getState(quizId)
        return state ? state.submittedAnswers.has(participantId) : false
    }

    clearSubmittedAnswers(quizId: string): void {
        const state = this.getState(quizId)
        if (state) {
            state.submittedAnswers.clear()
            this.states.set(quizId, state)
        }
    }

    getAllParticipants(quizId: string): Set<string> {
        const state = this.getState(quizId)
        return state ? state.participants : new Set()
    }

    getSubmittedAnswersCount(quizId: string): number {
        const state = this.getState(quizId)
        return state ? state.submittedAnswers.size : 0
    }

    getCurrentQuestionIndex(quizId: string): number {
        const state = this.getState(quizId)
        return state ? state.currentQuestionIndex : -1
    }

    incrementQuestionIndex(quizId: string): void {
        const state = this.getOrCreateState(quizId)
        state.currentQuestionIndex++
        this.states.set(quizId, state)
    }

    setQuestionStartTime(quizId: string, time?: number): void {
        const state = this.getOrCreateState(quizId)
        state.questionStartTime = time || Date.now()
        this.states.set(quizId, state)
    }

    getQuestionStartTime(quizId: string): number | undefined {
        const state = this.getState(quizId)
        return state?.questionStartTime
    }
}
