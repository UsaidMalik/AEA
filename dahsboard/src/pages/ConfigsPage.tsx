import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Container, Typography, Card, CardContent, Box, Chip, Stack,
    CircularProgress, Button, Avatar, IconButton, Collapse,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Snackbar, Alert, Divider,
} from '@mui/material'
import {
    Settings, Add, Apps, Language, EmojiEmotions, Timer, Security,
    ExpandMore, ExpandLess, Delete, PlayArrow,
} from '@mui/icons-material'

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

const PolicyList = ({ label, items, color }: { label: string; items: string[]; color: string }) => {
    if (!items || items.length === 0) return null
    return (
        <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {items.map(item => (
                    <Chip key={item} label={item} size="small" sx={{ bgcolor: color, fontSize: 12 }} />
                ))}
            </Box>
        </Box>
    )
}

const ConfigsPage = () => {
    const navigate = useNavigate()
    const [configs, setConfigs] = useState<Config[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Config | null>(null)
    const [starting, setStarting] = useState<string | null>(null)
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    })

    const fetchConfigs = () => {
        setLoading(true)
        fetch('/api/configs?page=1&limit=50')
            .then(r => r.json())
            .then(data => setConfigs(data.data || []))
            .catch(err => console.error('Failed to fetch configs:', err))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchConfigs() }, [])

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            const res = await fetch(`/api/configs/${deleteTarget._id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete')
            setConfigs(prev => prev.filter(c => c._id !== deleteTarget._id))
            setSnackbar({ open: true, message: `Deleted "${deleteTarget.name}"`, severity: 'success' })
        } catch {
            setSnackbar({ open: true, message: 'Failed to delete configuration', severity: 'error' })
        }
        setDeleteTarget(null)
    }

    const handleStart = async (config: Config) => {
        setStarting(config._id)
        try {
            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config_name: config.name }),
            })
            const data = await res.json()
            if (!res.ok) {
                setSnackbar({ open: true, message: data.error || 'Failed to start session', severity: 'error' })
                setStarting(null)
                return
            }
            setSnackbar({ open: true, message: `Session started with "${config.name}"`, severity: 'success' })
            setTimeout(() => navigate('/sessions'), 1000)
        } catch {
            setSnackbar({ open: true, message: 'Processing engine not available', severity: 'error' })
            setStarting(null)
        }
    }

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#eff6ff', color: '#2563eb' }}>
                        <Settings />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700}>My Configurations</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/config/new')}
                    sx={{
                        textTransform: 'none', borderRadius: 2, fontWeight: 600,
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        '&:hover': { background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)' },
                    }}
                >
                    New Config
                </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                View, manage, and start sessions from your saved configurations
            </Typography>

            {configs.length === 0 ? (
                <Card elevation={0} sx={{
                    p: 6, textAlign: 'center',
                    border: '1px solid', borderColor: 'divider', borderRadius: 3,
                }}>
                    <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#f3e5f5', color: '#7c3aed' }}>
                        <Add sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary" mb={1}>
                        No configurations yet
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
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            '&:hover': { background: 'linear-gradient(135deg, #1d4ed8, #6d28d9)' },
                        }}
                    >
                        Create Configuration
                    </Button>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {configs.map(config => {
                        const isExpanded = expanded === config._id
                        const { json } = config
                        return (
                            <Card key={config._id} elevation={0} sx={{
                                border: '1px solid', borderColor: isExpanded ? '#2563eb' : 'divider',
                                borderRadius: 3, transition: 'border-color 0.2s',
                            }}>
                                <CardContent sx={{ pb: isExpanded ? 0 : undefined }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : config._id)}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography variant="h6" fontWeight={600}>{config.name}</Typography>
                                                <Chip label={json.action} size="small"
                                                    sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 500 }} />
                                            </Box>
                                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                                {json.apps && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Apps sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {json.apps.deny.length} blocked, {json.apps.allow.length} allowed
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {json.web && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Language sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {json.web.deny.length} blocked, {json.web.allow.length} allowed
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {json.emotion && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <EmojiEmotions sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {json.emotion.deny.length} flagged
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<PlayArrow />}
                                                onClick={() => handleStart(config)}
                                                disabled={starting === config._id}
                                                sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                                            >
                                                {starting === config._id ? 'Starting...' : 'Start'}
                                            </Button>
                                            <IconButton size="small" color="error" onClick={() => setDeleteTarget(config)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => setExpanded(isExpanded ? null : config._id)}>
                                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </CardContent>

                                <Collapse in={isExpanded}>
                                    <Divider />
                                    <CardContent>
                                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                            {json.enforcement_level && (
                                                <Chip icon={<Security sx={{ fontSize: 14 }} />}
                                                    label={json.enforcement_level} size="small" variant="outlined"
                                                    color={json.enforcement_level === 'strict' ? 'error' : 'warning'} />
                                            )}
                                            {json.session_time_limit && (
                                                <Chip icon={<Timer sx={{ fontSize: 14 }} />}
                                                    label={`${Math.round(json.session_time_limit / 60)} min`}
                                                    size="small" variant="outlined" />
                                            )}
                                            {json.camera_displayed !== undefined && (
                                                <Chip label={json.camera_displayed ? 'Camera on' : 'Camera off'}
                                                    size="small" variant="outlined" />
                                            )}
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
                                                Created {new Date(config.created_ts).toLocaleDateString()}
                                            </Typography>
                                        </Stack>

                                        {json.apps && (
                                            <>
                                                <PolicyList label="Allowed Apps" items={json.apps.allow} color="#e8f5e9" />
                                                <PolicyList label="Blocked Apps" items={json.apps.deny} color="#ffebee" />
                                            </>
                                        )}
                                        {json.web && (
                                            <>
                                                <PolicyList label="Allowed Websites" items={json.web.allow} color="#e8f5e9" />
                                                <PolicyList label="Blocked Websites" items={json.web.deny} color="#ffebee" />
                                            </>
                                        )}
                                        {json.emotion && (
                                            <>
                                                <PolicyList label="Allowed Emotions" items={json.emotion.allow} color="#e8f5e9" />
                                                <PolicyList label="Flagged Emotions" items={json.emotion.deny} color="#fff3e0" />
                                            </>
                                        )}
                                    </CardContent>
                                </Collapse>
                            </Card>
                        )
                    })}
                </Stack>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Delete Configuration</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" sx={{ textTransform: 'none' }}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    )
}

export default ConfigsPage
