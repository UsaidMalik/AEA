import { Container, Typography, Grid, Card, CardContent, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.tsx'




const HomePage = () => {
    const { userName } = useUser()
    const navigate = useNavigate()

    const features = [
        { title: 'Session Configuration', description: 'Create and manage focus session policies for apps, websites, and emotions.' },
        { title: 'Real-time Monitoring', description: 'Track your focus, app usage, web activity, and emotional state live.' },
        { title: 'Policy Management', description: 'Define allowed and denied apps, websites, and emotional triggers.' },
    ]

    return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
            <Typography variant="h4" fontWeight={700}>Hello, {userName}!</Typography>
            <Typography variant="body1" sx={{ mt: 1, mb: 4 }}>
                Your AI Accountable Executive Assistant
            </Typography>

            <Grid container spacing={3}>
                {features.map((f) => (
                    <Grid size={{ xs: 12, md: 4 }} key={f.title}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600}>{f.title}</Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>{f.description}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Button variant="contained" size="large" onClick={() => navigate('/action')} sx={{ mt: 4 }}>
                Get Started
            </Button>
        </Container>
    )
}

export default HomePage


