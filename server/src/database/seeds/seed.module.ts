import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import configuration from '../../config/configuration'
import {
    Leaderboard,
    LeaderboardSchema,
} from '../../modules/leaderboard/entities/leaderboard.entity'
import { Quiz, QuizSchema } from '../../modules/quiz/entities/quiz.entity'
import { User, UserSchema } from '../../modules/user/entities/user.entity'
import { SeedService } from './init.seed'

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [configuration],
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const uri = configService.get<string>('database.uri')
                console.log('MongoDB URI:', uri)
                return { uri }
            },
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Quiz.name, schema: QuizSchema },
            { name: Leaderboard.name, schema: LeaderboardSchema },
        ]),
    ],
    providers: [SeedService],
})
export class SeedModule {}
