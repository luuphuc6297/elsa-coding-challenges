'use client'

import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store/useAuthStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import LoadingButton from '@mui/lab/LoadingButton'
import {
    Alert,
    Box,
    Container,
    IconButton,
    InputAdornment,
    Link as MuiLink,
    Paper,
    TextField,
    Typography,
} from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

export default function RegisterPage() {
    const router = useRouter()
    const { isAuthenticated } = useAuthStore()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    })

    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/')
        }
    }, [isAuthenticated, router])

    const onSubmit = async (data: RegisterInput) => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await authAPI.register({
                email: data.email,
                password: data.password,
                username: data.username,
                fullName: data.fullName,
            })
            if (response.success) {
                router.push('/login?registered=true')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during registration')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        width: '100%',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography component="h1" variant="h4" align="center" gutterBottom>
                        Register
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {typeof error === 'string'
                                ? error
                                : 'An error occurred during registration'}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email"
                            autoComplete="email"
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            {...register('email')}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            autoComplete="username"
                            error={!!errors.username}
                            helperText={errors.username?.message}
                            {...register('username')}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            id="fullName"
                            label="Full Name"
                            autoComplete="name"
                            error={!!errors.fullName}
                            helperText={errors.fullName?.message}
                            {...register('fullName')}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="new-password"
                            error={!!errors.password}
                            helperText={errors.password?.message}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            {...register('password')}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Confirm Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            autoComplete="new-password"
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword?.message}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle confirm password visibility"
                                            onClick={() =>
                                                setShowConfirmPassword(!showConfirmPassword)
                                            }
                                            edge="end"
                                        >
                                            {showConfirmPassword ? (
                                                <VisibilityOff />
                                            ) : (
                                                <Visibility />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            {...register('confirmPassword')}
                        />

                        <LoadingButton
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            loading={isLoading}
                        >
                            Register
                        </LoadingButton>

                        <Box sx={{ textAlign: 'center' }}>
                            <MuiLink
                                component={Link}
                                href="/login"
                                variant="body2"
                                sx={{ textDecoration: 'none' }}
                            >
                                Already have an account? Sign in
                            </MuiLink>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </Container>
    )
}
