import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { SeedModule } from './seed.module'
import { SeedService } from './init.seed'

async function bootstrap() {
    const logger = new Logger('Seed')
    try {
        logger.log('Starting seed process...')
        const app = await NestFactory.create(SeedModule)
        const seeder = app.get(SeedService)

        logger.log('Running seed...')
        await seeder.seed()
        logger.log('Seed completed successfully')

        await app.close()
    } catch (error) {
        logger.error('Seed failed:', error)
        process.exit(1)
    }
}

bootstrap()
