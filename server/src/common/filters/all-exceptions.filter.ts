import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionsHandler')

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse()
        const request = ctx.getRequest()

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception instanceof Error ? exception.message : 'Internal server error',
        }

        this.logger.error(
            `${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : ''
        )

        response.status(status).json(errorResponse)
    }
}
