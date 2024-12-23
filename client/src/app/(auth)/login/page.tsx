'use client'

import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { useAuthStore } from '@/store/useAuthStore'
import { zodResolver } from '@hookform/resolvers/zod'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import LoadingButton from '@mui/lab/LoadingButton'
import {
    Alert,
    Box,
    Card,
    CardContent,
    Checkbox,
    Container,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link as MuiLink,
    TextField,
    Typography
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export default function LoginPage() {
    const router = useRouter()
    const { login } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })

    const mutation = useMutation({
        mutationFn: async (data: LoginInput) => {
            await login(data.email, data.password)
        },
        onSuccess: () => {
            router.push('/dashboard')
        },
    })

    const onSubmit = (data: LoginInput) => {
        mutation.mutate(data)
    }

    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Card className="w-full">
                    <CardContent sx={{ p: 6 }}>
                        <Box sx={{ mb: 6, textAlign: 'center' }}>
                            <Typography component="h1" variant="h4" gutterBottom>
                                Welcome back! 👋
                            </Typography>
                            <Typography color="text.secondary">
                                Please sign in to your account and start the adventure
                            </Typography>
                        </Box>

                        {mutation.error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {mutation.error instanceof Error
                                    ? mutation.error.message
                                    : 'Login failed'}
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
                                autoFocus
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                {...register('email')}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
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

                            <Box
                                sx={{
                                    mt: 2,
                                    mb: 4,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <FormControlLabel
                                    control={<Checkbox value="remember" color="primary" />}
                                    label="Remember me"
                                />
                                <MuiLink component={Link} href="/forgot-password" variant="body2">
                                    Forgot password?
                                </MuiLink>
                            </Box>

                            <LoadingButton
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                loading={mutation.isPending}
                            >
                                Sign In
                            </LoadingButton>

                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    New on our platform?{' '}
                                    <MuiLink component={Link} href="/register" variant="body2">
                                        Create an account
                                    </MuiLink>
                                </Typography>
                            </Box>
                        </form>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    )
}
