export interface ResponseType<T> {
    success: boolean
    message?: string
    data?: T
    error?: string
}

export class ResponseUtil {
    static success<T>(data: T, message?: string): ResponseType<T> {
        return {
            success: true,
            message,
            data,
        }
    }

    static error<T>(error: string, message?: string): ResponseType<T> {
        return {
            success: false,
            message,
            error,
        }
    }
}
