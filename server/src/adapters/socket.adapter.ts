import { IoAdapter } from '@nestjs/platform-socket.io'
import { Server, ServerOptions } from 'socket.io'

export class SocketAdapter extends IoAdapter {
    createIOServer(port: number, options?: any): Server {
        const serverOptions: Partial<ServerOptions> = {
            ...options,
            cors: {
                origin: 'http://localhost:3002',
                methods: ['GET', 'POST', 'OPTIONS'],
                credentials: true,
                allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
            },
            allowEIO3: true,
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000,
            cookie: {
                name: 'io',
                httpOnly: true,
                path: '/',
            },
            path: '/socket.io/',
            serveClient: false,
            connectTimeout: 45000,
            upgradeTimeout: 10000,
            maxHttpBufferSize: 1e8,
            allowUpgrades: true,
            perMessageDeflate: {
                threshold: 1024,
            },
            httpCompression: {
                threshold: 1024,
            },
        }

        const server = super.createIOServer(port, serverOptions)
        return server
    }
}
