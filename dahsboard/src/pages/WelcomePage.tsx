import { useState } from 'react'
import { Container, Typography, TextField, Button, Paper, Box, Avatar } from '@mui/material'
import { MonitorHeart, ArrowForward } from '@mui/icons-material'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

const WelcomePage = () => {
    const [name, setName] = useState('')
    const { setUserName } = useUser()
    const navigate = useNavigate()

    const handleContinue = () => {
        if (name.trim()) {
            setUserName(name.trim())
            navigate('/action')
        }
    }

    const handleGuest = () => {
        setUserName('Guest')
        navigate('/action')
    }

    return (
        <Container maxWidth="sm" sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh',
        }}>
            <Avatar sx={{
                width: 72, height: 72, mb: 3,
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.25)',
            }}>
                <MonitorHeart sx={{ fontSize: 36 }} />
            </Avatar>

            <Typography variant="h3" textAlign="center" sx={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                mb: 1,
            }}>
                AEA
            </Typography>

            <Typography variant="body1" color="text.secondary" mb={5} textAlign="center">
                Productivity enforcement for focused sessions
            </Typography>

            <Paper elevation={0} sx={{
                p: 4, width: '100%', maxWidth: 400,
                borderRadius: 3, border: '1px solid', borderColor: 'divider',
            }}>
                <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                    Your name
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Used to personalise your session view
                </Typography>
                <TextField
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleContinue()}
                    placeholder="e.g. Alex"
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                />
                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleContinue}
                    disabled={!name.trim()}
                    endIcon={<ArrowForward />}
                    sx={{
                        py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600,
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        '&:hover': { background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)' },
                    }}
                >
                    Get Started
                </Button>
            </Paper>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">or</Typography>
                <Button variant="text" onClick={handleGuest} sx={{
                    textTransform: 'none', color: '#2563eb', fontWeight: 500,
                }}>
                    Continue as Guest
                </Button>
            </Box>
        </Container>
    )
}

export default WelcomePage
