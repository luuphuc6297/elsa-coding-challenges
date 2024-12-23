'use client'

import { quizAPI } from '@/services/api'
import { zodResolver } from '@hookform/resolvers/zod'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    IconButton,
    TextField,
    Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

const questionSchema = z.object({
    questionId: z.string(),
    content: z.string().min(1, 'Question content is required'),
    options: z.array(z.string()).min(2, 'At least 2 options are required'),
    correctAnswer: z.string().min(1, 'Correct answer is required'),
    points: z.number().min(1, 'Points must be at least 1'),
    timeLimit: z.number().min(10, 'Time limit must be at least 10 seconds'),
})

const createQuizSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    duration: z.number().min(1, 'Duration must be at least 1 minute'),
    questions: z.array(questionSchema).min(1, 'At least 1 question is required'),
})

type CreateQuizInput = z.infer<typeof createQuizSchema>

export default function CreateQuizPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const formId = useId()
    const generateId = () => `${formId}-${mounted ? Date.now() : '0'}`

    useEffect(() => {
        setMounted(true)
    }, [])

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateQuizInput>({
        resolver: zodResolver(createQuizSchema),
        defaultValues: {
            title: '',
            description: '',
            duration: 30,
            questions: [
                {
                    questionId: generateId(),
                    content: '',
                    options: ['', ''],
                    correctAnswer: '',
                    points: 10,
                    timeLimit: 30,
                },
            ],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'questions',
    })

    const onSubmit = async (data: CreateQuizInput) => {
        try {
            const response = await quizAPI.createQuiz(data)
            if (response.success) {
                router.push(`/quiz/${response.data?._id}`)
            }
        } catch (error) {
            console.error('Failed to create quiz:', error)
        }
    }

    const handleCancel = useCallback(() => {
        router.back()
    }, [router])

    const handleAddQuestion = useCallback(() => {
        append({
            questionId: generateId(),
            content: '',
            options: ['', ''],
            correctAnswer: '',
            points: 10,
            timeLimit: 30,
        })
    }, [append, generateId])

    if (!mounted) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography>Loading...</Typography>
            </Container>
        )
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
                Create New Quiz
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Quiz Title"
                                    error={!!errors.title}
                                    helperText={errors.title?.message}
                                    {...register('title')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Quiz Description"
                                    error={!!errors.description}
                                    helperText={errors.description?.message}
                                    {...register('description')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    type="number"
                                    label="Duration (minutes)"
                                    error={!!errors.duration}
                                    helperText={errors.duration?.message}
                                    {...register('duration', { valueAsNumber: true })}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {fields.map((field, index) => (
                    <Card key={field.id} sx={{ mb: 4 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">Question {index + 1}</Typography>
                                {fields.length > 1 && (
                                    <IconButton
                                        color="error"
                                        onClick={() => remove(index)}
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                )}
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Question"
                                        error={!!errors.questions?.[index]?.content}
                                        helperText={errors.questions?.[index]?.content?.message}
                                        {...register(`questions.${index}.content`)}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Options
                                    </Typography>
                                    {field.options.map((_, optionIndex) => (
                                        <TextField
                                            key={optionIndex}
                                            fullWidth
                                            sx={{ mb: 2 }}
                                            label={`Option ${optionIndex + 1}`}
                                            error={
                                                !!errors.questions?.[index]?.options?.[optionIndex]
                                            }
                                            helperText={
                                                errors.questions?.[index]?.options?.[optionIndex]
                                                    ?.message
                                            }
                                            {...register(
                                                `questions.${index}.options.${optionIndex}`
                                            )}
                                        />
                                    ))}
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Correct Answer"
                                        error={!!errors.questions?.[index]?.correctAnswer}
                                        helperText={
                                            errors.questions?.[index]?.correctAnswer?.message
                                        }
                                        {...register(`questions.${index}.correctAnswer`)}
                                    />
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        label="Points"
                                        error={!!errors.questions?.[index]?.points}
                                        helperText={errors.questions?.[index]?.points?.message}
                                        {...register(`questions.${index}.points`, {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        type="number"
                                        fullWidth
                                        label="Time Limit (seconds)"
                                        error={!!errors.questions?.[index]?.timeLimit}
                                        helperText={errors.questions?.[index]?.timeLimit?.message}
                                        {...register(`questions.${index}.timeLimit`, {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                ))}

                <Box sx={{ mb: 4 }}>
                    <Button startIcon={<AddIcon />} onClick={handleAddQuestion}>
                        Add Question
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting}
                    >
                        Create Quiz
                    </Button>
                </Box>
            </form>
        </Container>
    )
}
