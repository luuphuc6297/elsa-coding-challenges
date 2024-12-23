import { useAuthStore } from '@/store/useAuthStore'
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function Navbar() {
  const router = useRouter()
  const { isAuthenticated, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: 'flex',
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Quiz App
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
            <Button color="inherit" component={Link} href="/quiz/list">
              Quizzes
            </Button>
            {isAuthenticated && (
              <Button color="inherit" component={Link} href="/dashboard">
                Dashboard
              </Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {isAuthenticated ? (
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            ) : (
              <>
                <Button color="inherit" component={Link} href="/login">
                  Login
                </Button>
                <Button color="inherit" component={Link} href="/register">
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
} 