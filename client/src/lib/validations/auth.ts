import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
    .object({
        email: z.string().email('Invalid email address'),
        password: z
            .string()
            .min(6, 'Password must be at least 6 characters')
            .max(50, 'Password must not exceed 50 characters'),
        confirmPassword: z.string(),
        username: z
            .string()
            .min(3, 'Username must be at least 3 characters')
            .max(20, 'Username must not exceed 20 characters'),
        fullName: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
