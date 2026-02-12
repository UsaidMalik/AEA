import { Container, Typography, Grid, Card, CardActionArea, Box, Button, Avatar } from '@mui/material'
import { PlayArrow, Tune, Bolt, Build, ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const ActionPage = () => {
    const { userName } = useUser()
    const navigate = useNavigate()

    return (
        <Container maxWidth="md" sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            mt: 8, mb: 4,
        }}>
            <Typography variant="h4" fontWeight={700} textAlign="center">
                What would you like to do, {userName}?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 5 }} textAlign="center">
                Choose how you want to proceed with your PC session
            </Typography>

            <Grid container spacing={3} sx={{ width: '100%' }}>
                {/* Start Pre-configured */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card elevation={0} sx={{
                        height: '100%', position: 'relative', overflow: 'hidden',
                        border: '1px solid', borderColor: 'divider', borderRadius: 3,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                    }}>
                        {/* Decorative blob */}
                        <Box sx={{
                            position: 'absolute', top: -30, right: -30,
                            width: 120, height: 120, borderRadius: '50%',
                            bgcolor: 'rgba(92,107,192,0.08)',
                        }} />
                        <CardActionArea onClick={() => navigate('/configs')} sx={{ p: 4 }}>
                            <Avatar sx={{ width: 52, height: 52, bgcolor: '#2196f3', mb: 2, borderRadius: 2 }}>
                                <PlayArrow sx={{ fontSize: 28 }} />
                            </Avatar>
                            <Typography variant="h6" fontWeight={700}>Start Pre-configured Session</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                Begin immediately with your existing configuration. The backend will start processing right away.
                            </Typography>
                            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                                {['Quick start with saved settings', 'Backend processing begins instantly', 'Uses your default policies'].map(t => (
                                    <Box component="li" key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Bolt sx={{ fontSize: 16, color: '#00bcd4' }} />
                                        <Typography variant="body2" color="text.secondary">{t}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="#2196f3" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                Start Now <PlayArrow sx={{ fontSize: 16 }} />
                            </Typography>
                        </CardActionArea>
                    </Card>
                </Grid>

                {/* Make New Configuration */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card elevation={0} sx={{
                        height: '100%', position: 'relative', overflow: 'hidden',
                        border: '1px solid', borderColor: 'divider', borderRadius: 3,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                    }}>
                        <Box sx={{
                            position: 'absolute', top: -30, right: -30,
                            width: 120, height: 120, borderRadius: '50%',
                            bgcolor: 'rgba(124,77,255,0.08)',
                        }} />
                        <CardActionArea onClick={() => navigate('/config/new')} sx={{ p: 4 }}>
                            <Avatar sx={{ width: 52, height: 52, bgcolor: '#7c4dff', mb: 2, borderRadius: 2 }}>
                                <Tune sx={{ fontSize: 28 }} />
                            </Avatar>
                            <Typography variant="h6" fontWeight={700}>Make New Configuration</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                Create a custom configuration with your preferred session settings, app policies, and behavior rules.
                            </Typography>
                            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                                {['Customize session parameters', 'Define app & web policies', 'Set behavior monitoring rules'].map(t => (
                                    <Box component="li" key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Build sx={{ fontSize: 16, color: '#7c4dff' }} />
                                        <Typography variant="body2" color="text.secondary">{t}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="#7c4dff" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                Configure Now <Tune sx={{ fontSize: 16 }} />
                            </Typography>
                        </CardActionArea>
                    </Card>
                </Grid>
            </Grid>

            <Button
                variant="text"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/home')}
                sx={{ mt: 4, textTransform: 'none', color: 'text.secondary' }}
            >
                Back to Welcome
            </Button>
        </Container>
    )
}

export default ActionPage
