import { useState } from 'react'
import { Container, Typography, TextField, Button, Paper, Box, Avatar } from '@mui/material'
import { Shield, ArrowForward } from '@mui/icons-material'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

const WelcomePage = () => {
    const [name, setName] = useState('')
    const { setUserName } = useUser()
    const navigate = useNavigate()

    const handleContinue = () => {
        if (name.trim()) {
            setUserName(name.trim())
            navigate('/home')
        }
    }

    const handleGuest = () => {
        setUserName('Guest')
        navigate('/home')
    }

    return (
        <Container maxWidth="sm" sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh',
        }}>
            <Avatar sx={{
                width: 72, height: 72, mb: 3,
                bgcolor: '#7c4dff', boxShadow: '0 4px 20px rgba(124,77,255,0.3)',
            }}>
                <Shield sx={{ fontSize: 36 }} />
            </Avatar>

            <Typography variant="h3" fontWeight={700} sx={{
                background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                mb: 1,
            }}>
                Welcome to AEA Platform
            </Typography>

            <Typography variant="body1" color="text.secondary" mb={4}>
                Let's personalize your experience
            </Typography>

            <Paper elevation={0} sx={{
                p: 4, width: '100%', maxWidth: 400,
                borderRadius: 3, border: '1px solid', borderColor: 'divider',
            }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    What should we call you?
                </Typography>
                <TextField
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleContinue()}
                    placeholder="Enter your name"
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
                        background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                        '&:hover': { background: 'linear-gradient(135deg, #3f51b5, #651fff)' },
                    }}
                >
                    Continue
                </Button>
            </Paper>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Or</Typography>
                <Button variant="text" onClick={handleGuest} sx={{
                    textTransform: 'none', color: '#5c6bc0', fontWeight: 500,
                }}>
                    continue as Guest
                </Button>
            </Box>
        </Container>
    )
}

export default WelcomePage
