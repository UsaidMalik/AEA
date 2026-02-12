import { Container, Typography, Grid, Card, CardContent, CardActionArea, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'


const ActionPage = () => {
    const { userName } = useUser()
    const navigate = useNavigate()

    return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
            <Typography variant="h4" fontWeight={700}>
                What would you like to do, {userName}?
            </Typography>

            <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardActionArea onClick={() => navigate('/dashboard')} sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={600}>Start Pre-configured Session</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                View your monitoring dashboard and session data.
                            </Typography>
                        </CardActionArea>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardActionArea onClick={() => navigate('/config/new')} sx={{ p: 3 }}>
                            <Typography variant="h6" fontWeight={600}>Make New Configuration</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Create a new session config with app, web, and emotion policies.
                            </Typography>
                        </CardActionArea>
                    </Card>
                </Grid>
            </Grid>

            <Button variant="text" onClick={() => navigate('/home')} sx={{ mt: 3 }}>
                Back to Home
            </Button>
        </Container>
    )
}

export default ActionPage
