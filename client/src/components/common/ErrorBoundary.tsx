'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button, Container, Typography } from '@mui/material'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Container
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Something went wrong!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button onClick={this.handleReset} variant="contained" size="large">
            Try again
          </Button>
        </Container>
      )
    }

    return this.props.children
  }
} 