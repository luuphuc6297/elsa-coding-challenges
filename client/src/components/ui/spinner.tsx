import { cn } from '@/lib/utils'

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
    return (
        <div
            className={cn(
                'animate-spin rounded-full border-2 border-current border-t-transparent',
                {
                    sm: 'h-4 w-4',
                    md: 'h-8 w-8',
                    lg: 'h-12 w-12',
                }[size],
                className
            )}
        />
    )
} 