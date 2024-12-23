import { Box, Container } from '@mui/material'
import { Navbar } from './Navbar'

interface Props {
  children: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function Layout({ children, maxWidth = 'lg' }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth={maxWidth}>
          {children}
        </Container>
      </Box>
    </Box>
  )
} 