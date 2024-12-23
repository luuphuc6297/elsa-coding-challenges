import { BaseResponse } from 'common/interfaces/base-response.interface'

export class ResponseUtil {
    static success<T>(data: T, message?: string): BaseResponse<T> {
        return {
            success: true,
            data,
            message,
        }
    }

    static error(message: string): BaseResponse<null> {
        return {
            success: false,
            error: message,
        }
    }
}
