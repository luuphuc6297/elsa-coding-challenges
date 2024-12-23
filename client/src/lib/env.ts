import { z } from 'zod'

const envSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_SOCKET_URL: z.string().url(),
    NEXT_PUBLIC_JWT_EXPIRES_IN: z.string(),
    NEXT_PUBLIC_APP_NAME: z.string(),
    NEXT_PUBLIC_APP_DESCRIPTION: z.string(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
})

export const env = envSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_JWT_EXPIRES_IN: process.env.NEXT_PUBLIC_JWT_EXPIRES_IN,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

declare global {
    namespace NodeJS {
        interface ProcessEnv extends z.infer<typeof envSchema> {}
    }
} 