import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Container, Typography, Card, CardContent, TextField, Button,
    Select, MenuItem, Switch, FormControlLabel, Autocomplete,
    Chip, Stack, Snackbar, Alert, Box, Avatar, Grid, IconButton,
} from '@mui/material'
import { Computer, Add, Close, Save, ArrowBack } from '@mui/icons-material'

const handleAdd = (
    input: string,
    setInput: (v: string) => void,
    mode: 'allow' | 'deny',
    setAllow: React.Dispatch<React.SetStateAction<string[]>>,
    setDeny: React.Dispatch<React.SetStateAction<string[]>>,
) => {
    const val = input.trim().toLowerCase()
    if (!val) return
    if (mode === 'allow') {
        setAllow(prev => prev.includes(val) ? prev : [...prev, val])
    } else {
        setDeny(prev => prev.includes(val) ? prev : [...prev, val])
    }
    setInput('')
}

const PolicySection = ({
    label, placeholder, input, setInput, mode, setMode, allowed, denied, setAllowed, setDenied,
}: {
    label: string; placeholder: string
    input: string; setInput: (v: string) => void
    mode: 'allow' | 'deny'; setMode: (v: 'allow' | 'deny') => void
    allowed: string[]; denied: string[]
    setAllowed: React.Dispatch<React.SetStateAction<string[]>>
    setDenied: React.Dispatch<React.SetStateAction<string[]>>
}) => (
    <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>{label}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <TextField
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd(input, setInput, mode, setAllowed, setDenied)}
                    placeholder={placeholder}
                    size="small"
                    sx={{ flex: 1 }}
                />
                <Select value={mode} onChange={e => setMode(e.target.value as 'allow' | 'deny')} size="small">
                    <MenuItem value="allow">Allow</MenuItem>
                    <MenuItem value="deny">Deny</MenuItem>
                </Select>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleAdd(input, setInput, mode, setAllowed, setDenied)}
                    sx={{
                        textTransform: 'none', borderRadius: 2,
                        background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                        '&:hover': { background: 'linear-gradient(135deg, #3f51b5, #651fff)' },
                    }}
                >
                    Add
                </Button>
            </Stack>

            {/* List items */}
            <Stack spacing={0.5}>
                {allowed.map(a => (
                    <Box key={`allow-${a}`} sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        py: 1, px: 2, borderRadius: 2, bgcolor: 'action.hover',
                    }}>
                        <Typography variant="body2" fontWeight={500}>{a}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label="Allowed" size="small" color="success" variant="outlined" />
                            <IconButton size="small" onClick={() => setAllowed(prev => prev.filter(x => x !== a))}>
                                <Close sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Stack>
                    </Box>
                ))}
                {denied.map(a => (
                    <Box key={`deny-${a}`} sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        py: 1, px: 2, borderRadius: 2, bgcolor: 'action.hover',
                    }}>
                        <Typography variant="body2" fontWeight={500}>{a}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label="Blocked" size="small" color="error" variant="outlined" />
                            <IconButton size="small" onClick={() => setDenied(prev => prev.filter(x => x !== a))}>
                                <Close sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </CardContent>
    </Card>
)

const ConfigPage = () => {
    const navigate = useNavigate()

    // Session settings
    const [configName, setConfigName] = useState('')
    const [action, setAction] = useState('study')
    const [duration, setDuration] = useState(60)
    const [enforcement, setEnforcement] = useState('strict')
    const [cameraDisplayed, setCameraDisplayed] = useState(true)
    const [awayGraceSec, setAwayGraceSec] = useState(5)

    // App policies
    const [allowedApps, setAllowedApps] = useState<string[]>([])
    const [deniedApps, setDeniedApps] = useState<string[]>([])
    const [appInput, setAppInput] = useState('')
    const [appMode, setAppMode] = useState<'allow' | 'deny'>('deny')

    // Web policies
    const [allowedWebs, setAllowedWebs] = useState<string[]>([])
    const [deniedWebs, setDeniedWebs] = useState<string[]>([])
    const [webInput, setWebInput] = useState('')
    const [webMode, setWebMode] = useState<'allow' | 'deny'>('deny')

    // Emotion policies
    const [allowedEmotions, setAllowedEmotions] = useState<string[]>([])
    const [deniedEmotions, setDeniedEmotions] = useState<string[]>([])
    const [emotionInput, setEmotionInput] = useState('')
    const [emotionMode, setEmotionMode] = useState<'allow' | 'deny'>('deny')

    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    })

    const handleSubmit = async () => {
        const body = {
            name: configName,
            json: {
                action,
                apps: { allow: allowedApps, deny: deniedApps },
                web: { allow: allowedWebs, deny: deniedWebs, wildcard: true },
                emotion: { allow: allowedEmotions, deny: deniedEmotions },
                vision: { require_presence: true, away_grace_sec: awayGraceSec },
                session_time_limit: duration * 60,
                enforcement_level: enforcement,
                camera_displayed: cameraDisplayed,
            },
            source: 'preset',
        }
        try {
            const res = await fetch('/api/configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) {
                setSnackbar({ open: true, message: data.error || 'Failed to save', severity: 'error' })
                return
            }
            setSnackbar({ open: true, message: 'Configuration saved!', severity: 'success' })
            setTimeout(() => navigate('/action'), 1500)
        } catch {
            setSnackbar({ open: true, message: 'Network error', severity: 'error' })
        }
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#e8eaf6', color: '#5c6bc0' }}>
                    <Computer />
                </Avatar>
                <Typography variant="h4" fontWeight={700}>Create New Configuration</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={4}>
                Configure your custom PC session settings, applications, and policies
            </Typography>

            {/* Session Settings — row layout */}
            <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>Session Settings</Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 5 }}>
                            <TextField
                                label="Session Name"
                                placeholder="e.g., Development Session"
                                value={configName}
                                onChange={e => setConfigName(e.target.value)}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Autocomplete
                                freeSolo
                                options={['study', 'write_essay']}
                                value={action}
                                onInputChange={(_e, val) => setAction(val)}
                                renderInput={params => <TextField {...params} label="Session Type" size="small" />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                label="Duration (minutes)"
                                type="number"
                                value={duration}
                                onChange={e => setDuration(Number(e.target.value))}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Policy Sections */}
            <PolicySection
                label="Application Policies" placeholder="e.g. discord, chrome, spotify"
                input={appInput} setInput={setAppInput}
                mode={appMode} setMode={setAppMode}
                allowed={allowedApps} denied={deniedApps}
                setAllowed={setAllowedApps} setDenied={setDeniedApps}
            />
            <PolicySection
                label="Web Policies" placeholder="e.g. youtube, reddit, facebook"
                input={webInput} setInput={setWebInput}
                mode={webMode} setMode={setWebMode}
                allowed={allowedWebs} denied={deniedWebs}
                setAllowed={setAllowedWebs} setDenied={setDeniedWebs}
            />
            <PolicySection
                label="Emotion Policies" placeholder="e.g. angry, happy, calm"
                input={emotionInput} setInput={setEmotionInput}
                mode={emotionMode} setMode={setEmotionMode}
                allowed={allowedEmotions} denied={deniedEmotions}
                setAllowed={setAllowedEmotions} setDenied={setDeniedEmotions}
            />

            {/* Settings */}
            <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>Settings</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                label="Enforcement Level"
                                value={enforcement}
                                onChange={e => setEnforcement(e.target.value)}
                                fullWidth
                                size="small"
                            >
                                <MenuItem value="strict">Strict</MenuItem>
                                <MenuItem value="lenient">Lenient</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                label="Away Grace Period (seconds)"
                                type="number"
                                value={awayGraceSec}
                                onChange={e => setAwayGraceSec(Number(e.target.value))}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControlLabel
                                control={<Switch checked={cameraDisplayed} onChange={e => setCameraDisplayed(e.target.checked)} />}
                                label="Camera Displayed"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Actions */}
            <Stack direction="row" spacing={2}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Save />}
                    onClick={handleSubmit}
                    disabled={!configName.trim() || !action}
                    sx={{
                        px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 600,
                        background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                        '&:hover': { background: 'linear-gradient(135deg, #3f51b5, #651fff)' },
                    }}
                >
                    Save Configuration
                </Button>
                <Button
                    variant="text"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/action')}
                    sx={{ textTransform: 'none' }}
                >
                    Cancel
                </Button>
            </Stack>

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    )
}

export default ConfigPage
