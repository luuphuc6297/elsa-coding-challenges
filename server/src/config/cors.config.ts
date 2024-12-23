import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface'

export const corsConfig: CorsOptions = {
    origin: 'http://localhost:3002',
    credentials: true,
}
