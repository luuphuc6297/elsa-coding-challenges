type EventCallback = (...args: any[]) => void

class EventEmitter {
    private events: Map<string, Set<EventCallback>> = new Map()

    emit(event: string, ...args: any[]) {
        const callbacks = this.events.get(event)
        if (callbacks) {
            callbacks.forEach((callback) => callback(...args))
        }
    }

    on(event: string, callback: EventCallback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set())
        }
        this.events.get(event)?.add(callback)
    }

    off(event: string, callback: EventCallback) {
        this.events.get(event)?.delete(callback)
    }
}

export const authEvents = new EventEmitter()

export const AUTH_EVENTS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGOUT: 'LOGOUT',
} as const
