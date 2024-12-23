import { ThemeRegistry } from '@/components/theme-registry'
import { Providers } from '@/providers'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: {
        default: 'Quiz App',
        template: '%s | Quiz App',
    },
    description: 'Interactive quiz platform for learning and assessment',
    keywords: ['quiz', 'learning', 'assessment', 'education'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <ThemeRegistry>
                    <Providers>{children}</Providers>
                </ThemeRegistry>
            </body>
        </html>
    )
}
