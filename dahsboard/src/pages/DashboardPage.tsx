import { useState, useEffect } from 'react'
import {
    Container, Typography, Stack, TextField, Button,
    CircularProgress, Box, Paper, Grid,
} from '@mui/material'

import SessionOverview from '../components/sessionOverview'
import AppsTable from '../components/appsTable'
import WebTable from '../components/webTable'
import CameraEvents from '../components/cameraEvents'
import Interventions from '../components/interventions'
import Configs from '../components/configs'
import PredictionsComponent from '../components/predictions'

const DashboardPage = () => {
    const [query, setQuery] = useState('')
    const [ollamaResponse, setOllamaResponse] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState('')

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const response = await fetch('/api/sessions?page=1&limit=1')
                const data = await response.json()
                if (data.data && data.data.length > 0) {
                    setSessionId(data.data[0].session_id)
                }
            } catch (error) {
                console.error('Failed to fetch session ID:', error)
            }
        }
        fetchSession()
    }, [])

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
                setOllamaResponse(
                    `MongoDB Query:\n-----------------\nCollection: ${data.query.collection}\nFilter: ${JSON.stringify(data.query.filter, null, 2)}\nProjection: ${JSON.stringify(data.query.projection, null, 2)}\n\nResults (${data.results.length}):\n-----------------\n${JSON.stringify(data.results, null, 2)}`
                )
            } else {
                setOllamaResponse(`Error:\n${data.error}\n\n${data.raw || ''}`)
            }
        } catch (error) {
            console.error('Search error:', error)
            setOllamaResponse('Error: Could not get a response from the AI.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={700} mb={1}>Session Dashboard</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                {sessionId ? `Session: ${sessionId}` : 'No active session'}
            </Typography>

            <Stack spacing={3}>
                {/* AI Query */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        AI Assistant
                    </Typography>
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
                            onClick={handleSearch}
                            disabled={isLoading || !sessionId}
                            sx={{ minWidth: 100 }}
                        >
                            {isLoading ? <CircularProgress size={20} /> : 'Search'}
                        </Button>
                    </Stack>

                    {ollamaResponse && (
                        <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {ollamaResponse}
                            </Typography>
                        </Paper>
                    )}
                </Paper>

                {/* Session Overview (includes FocusChart) */}
                <SessionOverview />

                {/* Web + Apps side by side */}
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <WebTable />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <AppsTable />
                    </Grid>
                </Grid>

                {/* Camera Events */}
                <CameraEvents />

                {/* Interventions */}
                <Interventions />

                {/* Configs + Predictions side by side */}
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Configs />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <PredictionsComponent />
                    </Grid>
                </Grid>
            </Stack>
        </Container>
    )
}

export default DashboardPage
