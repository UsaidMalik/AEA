import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box, Chip, Avatar } from '@mui/material'
import { Home, Settings, BarChart, Person, FiberManualRecord, Dashboard } from '@mui/icons-material'
import { useUser } from './context/UserContext'
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import ActionPage from './pages/ActionPage'
import ConfigPage from './pages/ConfigPage'
import ConfigSelectPage from './pages/ConfigSelectPage'
import DashboardPage from './pages/DashboardPage'
import SessionsPage from './pages/SessionsPage'

const navItems = [
    { label: 'Home', path: '/home', icon: <Home sx={{ fontSize: 18 }} /> },
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard sx={{ fontSize: 18 }} /> },
    { label: 'New Configuration', path: '/config/new', icon: <Settings sx={{ fontSize: 18 }} /> },
    { label: 'Previous Sessions', path: '/sessions', icon: <BarChart sx={{ fontSize: 18 }} /> },
]

const App = () => {
    const { userName } = useUser()
    const location = useLocation()
    const navigate = useNavigate()
    const isWelcome = location.pathname === '/'
    const [sessionActive, setSessionActive] = useState(false)

    useEffect(() => {
        if (!userName || isWelcome) return
        const check = () => {
            fetch('/api/session/status')
                .then(r => r.json())
                .then(data => setSessionActive(data.running === true))
                .catch(() => setSessionActive(false))
        }
        check()
        const interval = setInterval(check, 5000)
        return () => clearInterval(interval)
    }, [userName, isWelcome])

    if (!userName && !isWelcome) {
        return <Navigate to="/" />
    }

    return (
        <Box sx={{ minHeight: '100vh' }}>
            {!isWelcome && (
                <AppBar position="static" elevation={0} sx={{
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}>
                    <Toolbar>
                        <Typography variant="h6" fontWeight={700} sx={{
                            cursor: 'pointer', color: '#5c6bc0',
                        }} onClick={() => navigate('/home')}>
                            AEA Platform
                        </Typography>

                        <Box sx={{ ml: 4, display: 'flex', gap: 0.5 }}>
                            {navItems.map(item => {
                                const active = location.pathname === item.path
                                return (
                                    <Button
                                        key={item.path}
                                        startIcon={item.icon}
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            textTransform: 'none', fontWeight: active ? 600 : 400,
                                            color: active ? '#5c6bc0' : 'text.secondary',
                                            borderBottom: active ? '2px solid #5c6bc0' : '2px solid transparent',
                                            borderRadius: 0, px: 2,
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                )
                            })}
                        </Box>

                        <Box sx={{ flexGrow: 1 }} />

                        <Chip
                            icon={<FiberManualRecord sx={{ fontSize: 10, color: sessionActive ? '#4caf50 !important' : '#bdbdbd !important' }} />}
                            label={sessionActive ? 'Session Active' : 'No Session'}
                            variant="outlined"
                            size="small"
                            onClick={sessionActive ? () => navigate('/dashboard') : undefined}
                            sx={{
                                mr: 2, fontWeight: 500,
                                borderColor: sessionActive ? '#4caf50' : '#bdbdbd',
                                color: sessionActive ? '#4caf50' : '#bdbdbd',
                                cursor: sessionActive ? 'pointer' : 'default',
                            }}
                        />

                        <Chip
                            avatar={<Avatar sx={{ bgcolor: '#e8eaf6', color: '#5c6bc0', width: 28, height: 28 }}><Person sx={{ fontSize: 16 }} /></Avatar>}
                            label={userName}
                            variant="outlined"
                            sx={{ fontWeight: 500, borderColor: 'divider' }}
                        />
                    </Toolbar>
                </AppBar>
            )}

            <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/action" element={<ActionPage />} />
                <Route path="/config/new" element={<ConfigPage />} />
                <Route path="/configs" element={<ConfigSelectPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Box>
    )
}

export default App
