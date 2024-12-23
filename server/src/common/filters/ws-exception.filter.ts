import { Catch, ArgumentsHost } from '@nestjs/common'
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets'

@Catch(WsException)
export class WebSocketExceptionFilter extends BaseWsExceptionFilter {
    catch(exception: WsException, host: ArgumentsHost) {
        const client = host.switchToWs().getClient()
        const error = exception.getError()
        const details = error instanceof Object ? { ...error } : { message: error }

        client.emit('error', {
            success: false,
            error: details,
        })
    }
}
