import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP')

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const { method, url } = request
        const now = Date.now()

        return next.handle().pipe(
            tap(() => {
                const response = context.switchToHttp().getResponse()
                const delay = Date.now() - now
                this.logger.log(`${method} ${url} ${response.statusCode} ${delay}ms`)
            })
        )
    }
}
