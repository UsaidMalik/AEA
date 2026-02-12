import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material'
import { useUser } from './context/UserContext'
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import ActionPage from './pages/ActionPage'
import ConfigPage from './pages/ConfigPage'
import DashboardPage from './pages/DashboardPage'
import SessionsPage from './pages/SessionsPage'

const App = () => {
    const { userName } = useUser()
    const location = useLocation()
    const navigate = useNavigate()
    const isWelcome = location.pathname === '/'

    if (!userName && !isWelcome) {
        return <Navigate to="/" />
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            {!isWelcome && (
                <AppBar position="static" elevation={1}>
                    <Toolbar>
                        <Typography variant="h6" fontWeight={700} sx={{ cursor: 'pointer' }}
                            onClick={() => navigate('/home')}>
                            AEA Platform
                        </Typography>
                        <Box sx={{ ml: 4, display: 'flex', gap: 1 }}>
                            <Button color="inherit" onClick={() => navigate('/home')}>Home</Button>
                            <Button color="inherit" onClick={() => navigate('/config/new')}>New Configuration</Button>
                            <Button color="inherit" onClick={() => navigate('/sessions')}>Previous Sessions</Button>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <Chip label={userName} variant="outlined"
                            sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }} />
                    </Toolbar>
                </AppBar>
            )}

            <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/action" element={<ActionPage />} />
                <Route path="/config/new" element={<ConfigPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Box>
    )
}

export default App
