import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Container, Typography, Card, CardContent, TextField, Button,
    Select, MenuItem, Switch, FormControlLabel, Autocomplete,
    Chip, Stack, Snackbar, Alert,
} from '@mui/material'

const ConfigPage = () => {
    const navigate = useNavigate()

    // Session settings
    const [configName, setConfigName] = useState('')
    const [action, setAction] = useState('study')
    const [duration, setDuration] = useState(60) // converted to seconds on submit
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

    const PolicySection = ({
        label, placeholder, input, setInput, mode, setMode, allowed, denied, setAllowed, setDenied,
    }: {
        label: string; placeholder: string;
        input: string; setInput: (v: string) => void;
        mode: 'allow' | 'deny'; setMode: (v: 'allow' | 'deny') => void;
        allowed: string[]; denied: string[];
        setAllowed: React.Dispatch<React.SetStateAction<string[]>>;
        setDenied: React.Dispatch<React.SetStateAction<string[]>>;
    }) => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" mb={2}>{label}</Typography>
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
                    <Button variant="outlined" onClick={() => handleAdd(input, setInput, mode, setAllowed, setDenied)}>
                        Add
                    </Button>
                </Stack>
                <Typography variant="body2" fontWeight={600} color="success.main">Allowed:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} mb={1} minHeight={32}>
                    {allowed.map(a => (
                        <Chip key={a} label={a} color="success" size="small"
                            onDelete={() => setAllowed(prev => prev.filter(x => x !== a))} />
                    ))}
                </Stack>
                <Typography variant="body2" fontWeight={600} color="error.main">Denied:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} minHeight={32}>
                    {denied.map(a => (
                        <Chip key={a} label={a} color="error" size="small"
                            onDelete={() => setDenied(prev => prev.filter(x => x !== a))} />
                    ))}
                </Stack>
            </CardContent>
        </Card>
    )

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight={700} mb={3}>New Configuration</Typography>

            {/* Session Settings */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" mb={2}>Session Settings</Typography>
                    <Stack spacing={2}>
                        <TextField
                            label="Config Name"
                            value={configName}
                            onChange={e => setConfigName(e.target.value)}
                            fullWidth
                        />
                        <Autocomplete
                            freeSolo
                            options={['study', 'write_essay']}
                            value={action}
                            onInputChange={(_e, val) => setAction(val)}
                            renderInput={(params) => <TextField {...params} label="Action Type" />}
                        />
                        <TextField
                            label="Duration (minutes)"
                            type="number"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            fullWidth
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Application Policies */}
            <PolicySection
                label="Application Policies" placeholder="e.g. discord.exe"
                input={appInput} setInput={setAppInput}
                mode={appMode} setMode={setAppMode}
                allowed={allowedApps} denied={deniedApps}
                setAllowed={setAllowedApps} setDenied={setDeniedApps}
            />

            {/* Web Policies */}
            <PolicySection
                label="Web Policies" placeholder="e.g. youtube.com"
                input={webInput} setInput={setWebInput}
                mode={webMode} setMode={setWebMode}
                allowed={allowedWebs} denied={deniedWebs}
                setAllowed={setAllowedWebs} setDenied={setDeniedWebs}
            />

            {/* Emotion Policies */}
            <PolicySection
                label="Emotion Policies" placeholder="e.g. angry, happy, calm"
                input={emotionInput} setInput={setEmotionInput}
                mode={emotionMode} setMode={setEmotionMode}
                allowed={allowedEmotions} denied={deniedEmotions}
                setAllowed={setAllowedEmotions} setDenied={setDeniedEmotions}
            />

            {/* Settings */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" mb={2}>Settings</Typography>
                    <Stack spacing={2}>
                        <TextField
                            select
                            label="Enforcement Level"
                            value={enforcement}
                            onChange={e => setEnforcement(e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="strict">Strict</MenuItem>
                            <MenuItem value="lenient">Lenient</MenuItem>
                        </TextField>
                        <TextField
                            label="Away Grace Period (seconds)"
                            type="number"
                            value={awayGraceSec}
                            onChange={e => setAwayGraceSec(Number(e.target.value))}
                            fullWidth
                        />
                        <FormControlLabel
                            control={<Switch checked={cameraDisplayed} onChange={e => setCameraDisplayed(e.target.checked)} />}
                            label="Camera Displayed"
                        />
                    </Stack>
                </CardContent>
            </Card>

            {/* Actions */}
            <Button variant="contained" size="large" onClick={handleSubmit}
                disabled={!configName.trim() || !action}>
                Save Configuration
            </Button>
            <Button variant="text" onClick={() => navigate('/action')} sx={{ ml: 2 }}>
                Cancel
            </Button>

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
                <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    )
}

export default ConfigPage
