import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Container, Typography, Stack, TextField, Button,
    CircularProgress, Box, Paper, Grid, Avatar, Chip,
} from '@mui/material'
import { Dashboard, Search, SmartToy, Stop, FiberManualRecord } from '@mui/icons-material'

import SessionOverview from '../components/sessionOverview'
import AppsTable from '../components/appsTable'
import WebTable from '../components/webTable'
import CameraEvents from '../components/cameraEvents'
import Interventions from '../components/interventions'
import Configs from '../components/configs'
import PredictionsComponent from '../components/predictions'

const DashboardPage = () => {
    const [searchParams] = useSearchParams()
    const urlSessionId = searchParams.get('session_id')

    const [query, setQuery] = useState('')
    const [ollamaResponse, setOllamaResponse] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState(urlSessionId || '')
    const [isLive, setIsLive] = useState(false)
    const [stopping, setStopping] = useState(false)
    const [resolving, setResolving] = useState(!urlSessionId)

    // Resolve session_id: URL param > running session > latest session
    useEffect(() => {
        if (urlSessionId) {
            setSessionId(urlSessionId)
            setResolving(false)
            return
        }

        const resolve = async () => {
            try {
                // Check if there's a running session
                const statusRes = await fetch('/api/session/status')
                const statusData = await statusRes.json()
                if (statusData.running && statusData.session_id) {
                    setSessionId(statusData.session_id)
                    setIsLive(true)
                    setResolving(false)
                    return
                }
            } catch { /* flask not running, fall through */ }

            try {
                // Fall back to latest session
                const sessRes = await fetch('/api/sessions?page=1&limit=1')
                const sessData = await sessRes.json()
                if (sessData.data && sessData.data.length > 0) {
                    setSessionId(sessData.data[0].session_id)
                }
            } catch (error) {
                console.error('Failed to resolve session:', error)
            }
            setResolving(false)
        }
        resolve()
    }, [urlSessionId])

    // Poll for live status when viewing a running session
    useEffect(() => {
        if (!sessionId) return
        const check = () => {
            fetch('/api/session/status')
                .then(r => r.json())
                .then(data => {
                    setIsLive(data.running === true && data.session_id === sessionId)
                })
                .catch(() => setIsLive(false))
        }
        check()
        const interval = setInterval(check, 5000)
        return () => clearInterval(interval)
    }, [sessionId])

    const handleSearch = async () => {
        if (!query || !sessionId) return
        setIsLoading(true)
        setOllamaResponse('')

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query, session_id: sessionId }),
            })

            if (!response.ok) throw new Error('Failed to get response from Ollama')

            const data = await response.json()
            if (data.success) {
                setOllamaResponse(data.answer)
            } else {
                setOllamaResponse(`Error: ${data.error}`)
            }
        } catch (error) {
            console.error('Search error:', error)
            setOllamaResponse('Error: Could not get a response from the AI.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStop = async () => {
        setStopping(true)
        try {
            await fetch('/api/session/stop', { method: 'POST' })
            setIsLive(false)
        } catch {
            console.error('Failed to stop session')
        } finally {
            setStopping(false)
        }
    }

    if (resolving) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#e8eaf6', color: '#5c6bc0' }}>
                        <Dashboard />
                    </Avatar>
                    <Typography variant="h4" fontWeight={700}>Session Dashboard</Typography>
                    {isLive && (
                        <Chip
                            icon={<FiberManualRecord sx={{ fontSize: 10, color: '#4caf50 !important' }} />}
                            label="Live"
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: '#4caf50', color: '#4caf50', fontWeight: 600 }}
                        />
                    )}
                </Box>
                {isLive && (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Stop />}
                        onClick={handleStop}
                        disabled={stopping}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                        {stopping ? 'Stopping...' : 'Stop Session'}
                    </Button>
                )}
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
                {sessionId ? `Session: ${sessionId}` : 'No session found'}
            </Typography>

            <Stack spacing={3}>
                {/* AI Query */}
                <Paper elevation={0} sx={{
                    p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SmartToy sx={{ color: '#5c6bc0' }} />
                        <Typography variant="subtitle1" fontWeight={600}>AI Assistant</Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Ask a question about your session..."
                            variant="outlined"
                            fullWidth
                            size="small"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                        />
                        <Button
                            variant="contained"
                            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <Search />}
                            onClick={handleSearch}
                            disabled={isLoading || !sessionId}
                            sx={{
                                minWidth: 110, textTransform: 'none', borderRadius: 2,
                                background: 'linear-gradient(135deg, #5c6bc0, #7c4dff)',
                                '&:hover': { background: 'linear-gradient(135deg, #3f51b5, #651fff)' },
                            }}
                        >
                            Search
                        </Button>
                    </Stack>

                    {ollamaResponse && (
                        <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {ollamaResponse}
                            </Typography>
                        </Paper>
                    )}
                </Paper>

                {/* Session Overview */}
                <SessionOverview sessionId={sessionId} />

                {/* Web + Apps side by side */}
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <WebTable sessionId={sessionId} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <AppsTable sessionId={sessionId} />
                    </Grid>
                </Grid>

                {/* Camera Events */}
                <CameraEvents sessionId={sessionId} />

                {/* Interventions */}
                <Interventions sessionId={sessionId} />

                {/* Configs + Predictions side by side */}
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Configs />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <PredictionsComponent sessionId={sessionId} />
                    </Grid>
                </Grid>
            </Stack>
        </Container>
    )
}

export default DashboardPage
