import { Container, Typography, Grid, Card, CardActionArea, Box, Avatar } from '@mui/material'
import { PlayArrow, Tune, Bolt, Build } from '@mui/icons-material'
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
            <Typography variant="h4" textAlign="center">
                Welcome back, {userName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 5 }} textAlign="center">
                Start a session or create a new policy configuration
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
                        <Box sx={{
                            position: 'absolute', top: -30, right: -30,
                            width: 120, height: 120, borderRadius: '50%',
                            bgcolor: 'rgba(37,99,235,0.07)',
                        }} />
                        <CardActionArea onClick={() => navigate('/configs')} sx={{ p: 4 }}>
                            <Avatar sx={{ width: 52, height: 52, bgcolor: '#2563eb', mb: 2, borderRadius: 2 }}>
                                <PlayArrow sx={{ fontSize: 28 }} />
                            </Avatar>
                            <Typography variant="h6">Start Pre-configured Session</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                Launch immediately with a saved configuration. Policy enforcement begins right away.
                            </Typography>
                            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                                {['Quick start with saved settings', 'Enforcement begins instantly', 'Uses your defined policies'].map(t => (
                                    <Box component="li" key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Bolt sx={{ fontSize: 16, color: '#2563eb' }} />
                                        <Typography variant="body2" color="text.secondary">{t}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="#2563eb" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                            bgcolor: 'rgba(124,58,237,0.07)',
                        }} />
                        <CardActionArea onClick={() => navigate('/config/new')} sx={{ p: 4 }}>
                            <Avatar sx={{ width: 52, height: 52, bgcolor: '#7c3aed', mb: 2, borderRadius: 2 }}>
                                <Tune sx={{ fontSize: 28 }} />
                            </Avatar>
                            <Typography variant="h6">Create New Configuration</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                Build a custom policy with app rules, web filters, and session duration limits.
                            </Typography>
                            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                                {['Customise session parameters', 'Define app & web policies', 'Set enforcement rules'].map(t => (
                                    <Box component="li" key={t} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Build sx={{ fontSize: 16, color: '#7c3aed' }} />
                                        <Typography variant="body2" color="text.secondary">{t}</Typography>
                                    </Box>
                                ))}
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="#7c3aed" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                Configure Now <Tune sx={{ fontSize: 16 }} />
                            </Typography>
                        </CardActionArea>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}

export default ActionPage
