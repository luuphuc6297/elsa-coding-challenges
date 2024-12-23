'use client'

import { useAuthStore } from '@/store/useAuthStore'
import {
    Dashboard as DashboardIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    Quiz as QuizIcon,
    Settings as SettingsIcon,
    List as ListIcon,
    Add as AddIcon,
} from '@mui/icons-material'
import {
    Box,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'My Quizzes', icon: <QuizIcon />, path: '/quiz/my-quizzes' },
    { text: 'All Quizzes', icon: <ListIcon />, path: '/quiz/list' },
    { text: 'Create Quiz', icon: <AddIcon />, path: '/quiz/create' },
]

export function DashboardSidebar() {
    const router = useRouter()
    const { logout } = useAuthStore()

    const handleLogout = () => {
        logout()
        router.push('/login')
    }

    return (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Quiz App
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton onClick={() => router.push(item.path)}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <Box sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
                <List>
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemIcon>
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </div>
    )
}
