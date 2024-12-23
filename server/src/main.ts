import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { WebSocketExceptionFilter } from 'common/filters/ws-exception.filter'
import { AppModule } from './app.module'
import { SocketAdapter } from './adapters/socket.adapter'

async function bootstrap() {
    const logger = new Logger('Bootstrap')
    const app = await NestFactory.create(AppModule, { cors: false })

    // CORS configuration
    app.enableCors({
        origin: 'http://localhost:3002',
        credentials: true,
    })
    logger.log('CORS enabled')

    // WebSocket Adapter with CORS
    app.useWebSocketAdapter(new SocketAdapter(app))
    logger.log('WebSocket adapter configured')

    // Global pipes
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
        })
    )
    logger.log('Global validation pipe configured')

    // Global filters
    app.useGlobalFilters(new WebSocketExceptionFilter())
    logger.log('WebSocket exception filter configured')

    // Swagger setup
    const config = new DocumentBuilder()
        .setTitle('Quiz API')
        .setDescription('The Quiz API description')
        .setVersion('1.0')
        .addBearerAuth()
        .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api', app, document)
    logger.log('Swagger documentation is available at /api')

    // Start server
    const port = process.env.PORT || 3000
    await app.listen(port)

    const url = await app.getUrl()
    logger.log(`🚀 Application is running on: ${url}`)
    logger.log(`📝 API Documentation available on: ${url}/api`)
    logger.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.log(
        `🔌 Database connected to: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/elsa-coding-challenges'}`
    )
    logger.log(
        `📦 Redis connected to: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    )
}

bootstrap()
