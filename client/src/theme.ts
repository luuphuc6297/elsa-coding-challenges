import { red } from '@mui/material/colors'
import { alpha, createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
    interface Palette {
        neutral: Palette['primary']
    }
    interface PaletteOptions {
        neutral: PaletteOptions['primary']
    }
}

const theme = createTheme({
    palette: {
        primary: {
            main: '#556cd6',
            light: '#757ce8',
            dark: '#002884',
            contrastText: '#fff',
        },
        secondary: {
            main: '#19857b',
            light: '#4aedc4',
            dark: '#00574b',
            contrastText: '#fff',
        },
        error: {
            main: red.A400,
        },
        neutral: {
            main: '#64748B',
            light: '#F8FAFC',
            dark: '#1E293B',
            contrastText: '#fff',
        },
        background: {
            default: '#F8FAFC',
            paper: '#FFFFFF',
        },
    },
    typography: {
        fontFamily: [
            'Geist Sans',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h4: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.57,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                outlined: {
                    '&:hover': {
                        backgroundColor: alpha('#556cd6', 0.04),
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow:
                        '0px 2px 4px rgba(31, 41, 55, 0.06), 0px 4px 6px rgba(100, 116, 139, 0.12)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
    shape: {
        borderRadius: 8,
    },
})

export default theme
