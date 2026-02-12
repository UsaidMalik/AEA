import { Container, Typography, Grid, Card, CardContent, Button, Avatar, Box } from '@mui/material'
import { AutoAwesome, Settings, Timeline, Shield, ArrowForward } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const features = [
    {
        title: 'Session Configuration',
        description: 'Configure session types, applications, and policy settings.',
        icon: <Settings />,
        color: '#5c6bc0',
        bg: '#e8eaf6',
    },
    {
        title: 'Real-time Monitoring',
        description: 'Track session data and view detailed statistics.',
        icon: <Timeline />,
        color: '#4caf50',
        bg: '#e8f5e9',
    },
    {
        title: 'Policy Management',
        description: 'Define and enforce web and behavior policies.',
        icon: <Shield />,
        color: '#7c4dff',
        bg: '#f3e5f5',
    },
]

const HomePage = () => {
    const { userName } = useUser()
    const navigate = useNavigate()

    return (
        <Container maxWidth="md" sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            mt: 8, mb: 4,
        }}>
            <Avatar sx={{
                width: 72, height: 72, mb: 3,
                bgcolor: '#7c4dff', boxShadow: '0 4px 20px rgba(124,77,255,0.3)',
            }}>
                <AutoAwesome sx={{ fontSize: 36 }} />
            </Avatar>

            <Typography variant="h3" fontWeight={700} textAlign="center">
                Hello, <Box component="span" sx={{ color: '#5c6bc0' }}>{userName}</Box>!
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 5 }} textAlign="center">
                Welcome to your comprehensive PC session management platform
            </Typography>

            <Grid container spacing={3} sx={{ mb: 5 }}>
                {features.map(f => (
                    <Grid size={{ xs: 12, md: 4 }} key={f.title}>
                        <Card elevation={0} sx={{
                            height: '100%', textAlign: 'center', p: 3,
                            border: '1px solid', borderColor: 'divider',
                            borderRadius: 3, transition: 'box-shadow 0.2s',
                            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                        }}>
                            <CardContent>
                                <Avatar sx={{
                                    width: 56, height: 56, mx: 'auto', mb: 2,
                                    bgcolor: f.bg, color: f.color,
                                }}>
                                    {f.icon}
                                </Avatar>
                                <Typography variant="subtitle1" fontWeight={600}>{f.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {f.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/action')}
                sx={{
                    px: 5, py: 1.5, borderRadius: 3, textTransform: 'none',
                    fontWeight: 600, fontSize: '1rem',
                    background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                    '&:hover': { background: 'linear-gradient(135deg, #3f51b5, #651fff)' },
                }}
            >
                Get Started
            </Button>
        </Container>
    )
}

export default HomePage
