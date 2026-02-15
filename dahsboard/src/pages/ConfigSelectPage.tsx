import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Container, Typography, Card, CardContent, CardActionArea,
    Grid, Chip, Stack, Box, CircularProgress, Button, Avatar, Snackbar, Alert,
} from '@mui/material'
import { PlaylistPlay, Add, ArrowBack, Apps, Language, EmojiEmotions, Timer, Security } from '@mui/icons-material'

interface Config {
    _id: string
    name: string
    json: {
        action: string
        apps?: { allow: string[]; deny: string[] }
        web?: { allow: string[]; deny: string[] }
        emotion?: { allow: string[]; deny: string[] }
        enforcement_level?: string
        session_time_limit?: number
        camera_displayed?: boolean
    }
    source: string
    created_ts: string
}

const ConfigSelectPage = () => {
    const navigate = useNavigate()
    const [configs, setConfigs] = useState<Config[]>([])
    const [loading, setLoading] = useState(true)
    const [starting, setStarting] = useState(false)
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    })

    useEffect(() => {
        fetch('/api/configs?page=1&limit=50')
            .then(r => r.json())
            .then(data => setConfigs(data.data || []))
            .catch(err => console.error('Failed to fetch configs:', err))
            .finally(() => setLoading(false))
    }, [])

    const handleSelect = async (config: Config) => {
        setStarting(true)
        try {
            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config_name: config.name }),
            })
            const data = await res.json()
            if (!res.ok) {
                setSnackbar({ open: true, message: data.error || 'Failed to start session', severity: 'error' })
                setStarting(false)
                return
            }
            setSnackbar({ open: true, message: `Session started with "${config.name}"`, severity: 'success' })
            setTimeout(() => navigate('/sessions', { state: { configName: config.name } }), 1000)
        } catch {
            setSnackbar({ open: true, message: 'Processing engine not available', severity: 'error' })
            setStarting(false)
        }
    }

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#e8eaf6', color: '#5c6bc0' }}>
                    <PlaylistPlay />
                </Avatar>
                <Typography variant="h4" fontWeight={700}>Select a Configuration</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={4}>
                Choose a saved configuration to start your session
            </Typography>

            {configs.length === 0 ? (
                <Card elevation={0} sx={{
                    p: 6, textAlign: 'center',
                    border: '1px solid', borderColor: 'divider', borderRadius: 3,
                }}>
                    <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#f3e5f5', color: '#7c4dff' }}>
                        <Add sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary" mb={1}>
                        No configurations found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Create your first configuration to get started
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/config/new')}
                        sx={{
                            textTransform: 'none', borderRadius: 2, fontWeight: 600,
                            background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                            '&:hover': { background: 'linear-gradient(135deg, #3f51b5, #651fff)' },
                        }}
                    >
                        Create Your First Configuration
                    </Button>
                </Card>
            ) : (
                <Grid container spacing={2}>
                    {configs.map(config => (
                        <Grid size={{ xs: 12, md: 6 }} key={config._id}>
                            <Card elevation={0} sx={{
                                height: '100%', border: '1px solid', borderColor: 'divider',
                                borderRadius: 3, transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
                            }}>
                                <CardActionArea onClick={() => handleSelect(config)} sx={{ p: 3, height: '100%' }}>
                                    <CardContent sx={{ p: 0 }}>
                                        <Typography variant="h6" fontWeight={600}>{config.name}</Typography>
                                        <Chip
                                            label={config.json.action}
                                            size="small"
                                            sx={{ mt: 1, mb: 2, bgcolor: '#e8eaf6', color: '#5c6bc0', fontWeight: 500 }}
                                        />

                                        <Stack spacing={0.5}>
                                            {config.json.apps && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Apps sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {config.json.apps.deny.length} blocked, {config.json.apps.allow.length} allowed
                                                    </Typography>
                                                </Box>
                                            )}
                                            {config.json.web && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Language sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {config.json.web.deny.length} blocked, {config.json.web.allow.length} allowed
                                                    </Typography>
                                                </Box>
                                            )}
                                            {config.json.emotion && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <EmojiEmotions sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {config.json.emotion.deny.length} blocked
                                                    </Typography>
                                                </Box>
                                            )}
                                            {config.json.session_time_limit && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Timer sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        {Math.round(config.json.session_time_limit / 60)} min
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                                            {config.json.enforcement_level && (
                                                <Chip
                                                    icon={<Security sx={{ fontSize: 14 }} />}
                                                    label={config.json.enforcement_level}
                                                    size="small"
                                                    variant="outlined"
                                                    color={config.json.enforcement_level === 'strict' ? 'error' : 'warning'}
                                                />
                                            )}
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                {new Date(config.created_ts).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => navigate('/config/new')}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                    disabled={starting}
                >
                    Create New Config
                </Button>
                <Button
                    variant="text"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/action')}
                    sx={{ textTransform: 'none', color: 'text.secondary' }}
                    disabled={starting}
                >
                    Back
                </Button>
            </Stack>

            {starting && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">Starting session...</Typography>
                </Box>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    )
}

export default ConfigSelectPage
