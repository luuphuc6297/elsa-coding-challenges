import { MetricsService } from 'shared/services/metrics.service'
import { Server, Socket } from 'socket.io'

// Socket Communication Interface
export interface ISocketCommunication {
    joinRoom(socket: Socket, room: string): Promise<void>
    leaveRoom(socket: Socket, room: string): Promise<void>
    emitToRoom(room: string, event: string, data: any): Promise<void>
    emitToClient(socket: Socket, event: string, data: any): Promise<void>
    broadcastToRoom(socket: Socket, room: string, event: string, data: any): Promise<void>
}

// Socket.IO Adapter Implementation
export class SocketIOAdapter implements ISocketCommunication {
    constructor(
        private readonly server: Server,
        private readonly metricsService: MetricsService
    ) {}

    async joinRoom(socket: Socket, room: string): Promise<void> {
        const startTime = Date.now()
        try {
            await socket.join(room)
            await this.metricsService.trackLatency('socket_join_room', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('socket_join_room', error.message)
            throw error
        }
    }

    async leaveRoom(socket: Socket, room: string): Promise<void> {
        const startTime = Date.now()
        try {
            await socket.leave(room)
            await this.metricsService.trackLatency('socket_leave_room', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('socket_leave_room', error.message)
            throw error
        }
    }

    async emitToRoom(room: string, event: string, data: any): Promise<void> {
        const startTime = Date.now()
        try {
            this.server.to(room).emit(event, data)
            await this.metricsService.trackLatency('socket_emit_room', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('socket_emit_room', error.message)
            throw error
        }
    }

    async emitToClient(socket: Socket, event: string, data: any): Promise<void> {
        const startTime = Date.now()
        try {
            socket.emit(event, data)
            await this.metricsService.trackLatency('socket_emit_client', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('socket_emit_client', error.message)
            throw error
        }
    }

    async broadcastToRoom(socket: Socket, room: string, event: string, data: any): Promise<void> {
        const startTime = Date.now()
        try {
            socket.to(room).emit(event, data)
            await this.metricsService.trackLatency('socket_broadcast_room', Date.now() - startTime)
        } catch (error) {
            await this.metricsService.trackError('socket_broadcast_room', error.message)
            throw error
        }
    }
}
