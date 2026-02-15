import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    Container, Typography, Card, CardContent, Box, Grid,
    CircularProgress, MenuItem, TextField, Avatar, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Tabs, Tab, Stack, Paper,
} from '@mui/material'
import {
    Timeline, People, AccessTime, TrendingUp,
    CalendarToday, OpenInNew, SmartToy, Search,
    Stop, FiberManualRecord, BarChart,
} from '@mui/icons-material'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart as RechartsBarChart, Bar,
} from 'recharts'

import SessionOverview from '../components/sessionOverview'
import AppsTable from '../components/appsTable'
import WebTable from '../components/webTable'
import CameraEvents from '../components/cameraEvents'
import Interventions from '../components/interventions'
import Configs from '../components/configs'
import PredictionsComponent from '../components/predictions'

// ============================================================================
// Types
// ============================================================================

interface Session {
    session_id: string
    config_name: string
    started_at: string
    ended_at: string | null
    stats?: {
        focus_pct: number
        away_secs: number
        violations: { web: number; app: number; affect: number }
    }
}

interface AppEvent {
    app_name: string
    ts_open: string
    ts_close: string
}

// ============================================================================
// Constants & Helpers
// ============================================================================

const PIE_COLORS = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#607d8b']

const statCardStyles = [
    { icon: <Timeline />, color: '#5c6bc0', bg: '#e8eaf6', badge: '+12%', badgeColor: '#4caf50' },
    { icon: <People />, color: '#4caf50', bg: '#e8f5e9', badge: '+8%', badgeColor: '#4caf50' },
    { icon: <AccessTime />, color: '#7c4dff', bg: '#f3e5f5', badge: '-5%', badgeColor: '#ff9800' },
    { icon: <TrendingUp />, color: '#ff9800', bg: '#fff3e0', badge: '+3%', badgeColor: '#4caf50' },
]

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const
const stripedRow = {
    '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
    '&:hover': { bgcolor: 'action.selected', cursor: 'pointer' },
    transition: 'background-color 0.15s',
} as const

// ============================================================================
// StatCard
// ============================================================================

const StatCard = ({ label, value, color, index }: { label: string; value: string; color?: string; index: number }) => {
    const style = statCardStyles[index]
    return (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: style.bg, color: style.color }}>
                        {style.icon}
                    </Avatar>
                    <Chip
                        label={style.badge}
                        size="small"
                        sx={{
                            fontWeight: 600, fontSize: '0.7rem', height: 22,
                            bgcolor: style.badgeColor === '#4caf50' ? '#e8f5e9' : '#fff3e0',
                            color: style.badgeColor,
                        }}
                    />
                </Box>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color }}>{value}</Typography>
            </CardContent>
        </Card>
    )
}

// ============================================================================
// AI Assistant (shared across tabs)
// ============================================================================

const AIAssistant = ({ sessionId }: { sessionId: string }) => {
    const [query, setQuery] = useState('')
    const [ollamaResponse, setOllamaResponse] = useState('')
    const [isLoading, setIsLoading] = useState(false)

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

    return (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
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
    )
}

// ============================================================================
// Tab 0 — Recent Session (was DashboardPage)
// ============================================================================

const RecentSessionTab = ({ sessionId, isLive, onStop, stopping }: {
    sessionId: string
    isLive: boolean
    onStop: () => void
    stopping: boolean
}) => (
    <Stack spacing={3}>
        {/* Live controls */}
        {isLive && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                    icon={<FiberManualRecord sx={{ fontSize: 10, color: '#4caf50 !important' }} />}
                    label="Live Session"
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: '#4caf50', color: '#4caf50', fontWeight: 600 }}
                />
                <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Stop />}
                    onClick={onStop}
                    disabled={stopping}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                >
                    {stopping ? 'Stopping...' : 'Stop Session'}
                </Button>
            </Box>
        )}

        <Typography variant="body2" color="text.secondary">
            {sessionId ? `Session: ${sessionId}` : 'No session found'}
        </Typography>

        {/* AI Assistant */}
        <AIAssistant sessionId={sessionId} />

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
)

// ============================================================================
// Tab 1 — All Sessions (was SessionsPage)
// ============================================================================

const AllSessionsTab = ({ sessions, appEvents, navigate }: {
    sessions: Session[]
    appEvents: AppEvent[]
    navigate: ReturnType<typeof useNavigate>
}) => {
    const [timeFilter, setTimeFilter] = useState('week')

    // --- Derived stats ---
    const activeSessions = sessions.filter(s => !s.ended_at).length
    const totalSessions = sessions.length

    const completedSessions = sessions.filter(s => s.ended_at)
    const avgDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) =>
            sum + (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()), 0)
        / completedSessions.length / 3600000
        : 0

    const avgCompliance = totalSessions > 0
        ? sessions.reduce((sum, s) => sum + (s.stats?.focus_pct || 0), 0) / totalSessions * 100
        : 0

    // --- Session Trends (group by day) ---
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const trendsMap: Record<string, number> = {}
    sessions.forEach(s => {
        const d = new Date(s.started_at).getDay()
        const day = dayNames[d === 0 ? 6 : d - 1]
        trendsMap[day] = (trendsMap[day] || 0) + 1
    })
    const trendsData = dayNames.map(d => ({ day: d, sessions: trendsMap[d] || 0 }))

    // --- App Usage Distribution ---
    const appUsageMap: Record<string, number> = {}
    appEvents.forEach(e => {
        if (e.ts_open && e.ts_close) {
            const dur = (new Date(e.ts_close).getTime() - new Date(e.ts_open).getTime()) / 60000
            appUsageMap[e.app_name] = (appUsageMap[e.app_name] || 0) + dur
        }
    })
    const totalAppTime = Object.values(appUsageMap).reduce((a, b) => a + b, 0) || 1
    const appUsageData = Object.entries(appUsageMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, mins]) => ({ name, value: Math.round((mins / totalAppTime) * 100) }))

    // --- Average Session Duration (bar chart) ---
    const durationData = completedSessions.slice(0, 10).map((s, i) => ({
        name: s.config_name || `Session ${i + 1}`,
        minutes: Math.round((new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000),
    }))

    // --- Policy Violations ---
    const violations = sessions.reduce(
        (acc, s) => {
            if (s.stats?.violations) {
                acc.app += s.stats.violations.app
                acc.web += s.stats.violations.web
                acc.affect += s.stats.violations.affect
            }
            return acc
        },
        { app: 0, web: 0, affect: 0 },
    )
    const violationsData = [
        { name: 'Blocked Apps', value: violations.app },
        { name: 'Blocked Sites', value: violations.web },
        { name: 'Emotion Triggers', value: violations.affect },
    ]

    const chartCard = { elevation: 0 as const, sx: { height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 3 } }

    return (
        <Stack spacing={3}>
            {/* Time filter */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ color: 'text.secondary', fontSize: 20 }} />
                <TextField
                    select
                    value={timeFilter}
                    onChange={e => setTimeFilter(e.target.value)}
                    size="small"
                    sx={{ width: 150 }}
                >
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="all">All Time</MenuItem>
                </TextField>
            </Box>

            {/* Stat Cards */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label="Active Sessions" value={String(activeSessions)} index={0} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label="Total Sessions" value={String(totalSessions)} index={1} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label="Avg Duration" value={`${avgDuration.toFixed(1)}h`} index={2} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <StatCard label="Policy Compliance" value={`${avgCompliance.toFixed(0)}%`}
                        color={avgCompliance > 70 ? '#4caf50' : '#ff9800'} index={3} />
                </Grid>
            </Grid>

            {/* Charts Row 1 */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card {...chartCard}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>Session Trends</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={trendsData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="sessions" stroke="#2196f3" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card {...chartCard}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>Application Usage Distribution</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={appUsageData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, value }) => `${name} ${value}%`}
                                    >
                                        {appUsageData.map((_e, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Row 2 */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card {...chartCard}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>Average Session Duration (minutes)</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <RechartsBarChart data={durationData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="minutes" fill="#4caf50" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card {...chartCard}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>Policy Violations</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <RechartsBarChart data={violationsData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={120} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#f44336" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Session List */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <CardContent>
                    <Typography variant="h6" fontWeight={600} mb={2}>All Sessions</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={headerSx}>Config</TableCell>
                                    <TableCell sx={headerSx}>Started</TableCell>
                                    <TableCell sx={headerSx}>Ended</TableCell>
                                    <TableCell sx={headerSx}>Duration</TableCell>
                                    <TableCell sx={headerSx}>Focus</TableCell>
                                    <TableCell sx={headerSx}>Violations</TableCell>
                                    <TableCell sx={headerSx}>Status</TableCell>
                                    <TableCell sx={headerSx} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sessions.map(s => {
                                    const ended = s.ended_at ? new Date(s.ended_at) : null
                                    const started = new Date(s.started_at)
                                    const durationMin = ended
                                        ? Math.round((ended.getTime() - started.getTime()) / 60000)
                                        : null
                                    const v = s.stats?.violations
                                    const totalV = v ? v.web + v.app + v.affect : 0

                                    return (
                                        <TableRow
                                            key={s.session_id}
                                            sx={stripedRow}
                                            onClick={() => navigate(`/sessions?session_id=${s.session_id}`)}
                                        >
                                            <TableCell sx={{ fontWeight: 500 }}>{s.config_name}</TableCell>
                                            <TableCell>{started.toLocaleString()}</TableCell>
                                            <TableCell>{ended ? ended.toLocaleString() : '-'}</TableCell>
                                            <TableCell>{durationMin !== null ? `${durationMin}m` : '-'}</TableCell>
                                            <TableCell>
                                                {s.stats?.focus_pct !== undefined
                                                    ? `${(s.stats.focus_pct * 100).toFixed(0)}%`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {v ? (
                                                    <Chip
                                                        label={totalV}
                                                        size="small"
                                                        color={totalV > 0 ? 'error' : 'success'}
                                                        variant="outlined"
                                                    />
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={ended ? 'Completed' : 'Active'}
                                                    size="small"
                                                    color={ended ? 'default' : 'success'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                    onClick={e => {
                                                        e.stopPropagation()
                                                        navigate(`/sessions?session_id=${s.session_id}`)
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {sessions.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                            No sessions found
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Stack>
    )
}

// ============================================================================
// Main — SessionsPage (combined)
// ============================================================================

const SessionsPage = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const urlSessionId = searchParams.get('session_id')
    const urlTab = searchParams.get('tab')

    // Tab: 0 = Recent Session, 1 = All Sessions
    const [tab, setTab] = useState(urlSessionId ? 0 : urlTab === 'all' ? 1 : 0)

    // Recent session state
    const [sessionId, setSessionId] = useState(urlSessionId || '')
    const [isLive, setIsLive] = useState(false)
    const [stopping, setStopping] = useState(false)
    const [resolving, setResolving] = useState(!urlSessionId)

    // All sessions state
    const [sessions, setSessions] = useState<Session[]>([])
    const [appEvents, setAppEvents] = useState<AppEvent[]>([])
    const [loading, setLoading] = useState(true)

    // Resolve session_id for Recent tab: URL param > running session > latest session
    useEffect(() => {
        if (urlSessionId) {
            setSessionId(urlSessionId)
            setResolving(false)
            return
        }

        const resolve = async () => {
            try {
                const statusRes = await fetch('/api/session/status')
                const statusData = await statusRes.json()
                if (statusData.running && statusData.session_id) {
                    setSessionId(statusData.session_id)
                    setIsLive(true)
                    setResolving(false)
                    return
                }
            } catch { /* flask not running */ }

            try {
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

    // Poll live status
    useEffect(() => {
        if (!sessionId) return
        const check = () => {
            fetch('/api/session/status')
                .then(r => r.json())
                .then(data => setIsLive(data.running === true && data.session_id === sessionId))
                .catch(() => setIsLive(false))
        }
        check()
        const interval = setInterval(check, 5000)
        return () => clearInterval(interval)
    }, [sessionId])

    // Fetch all sessions + app events for All Sessions tab
    useEffect(() => {
        Promise.all([
            fetch('/api/sessions?page=1&limit=50').then(r => r.json()),
            fetch('/api/apps?page=1&limit=100').then(r => r.json()),
        ])
            .then(([sessData, appData]) => {
                setSessions(sessData.data || [])
                setAppEvents(appData.data || [])
            })
            .catch(err => console.error('Failed to fetch data:', err))
            .finally(() => setLoading(false))
    }, [])

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

    const handleTabChange = (_: React.SyntheticEvent, newTab: number) => {
        setTab(newTab)
        if (newTab === 1) {
            setSearchParams({ tab: 'all' })
        } else {
            setSearchParams(sessionId ? { session_id: sessionId } : {})
        }
    }

    if (resolving || loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#e8eaf6', color: '#5c6bc0' }}>
                    <BarChart />
                </Avatar>
                <Typography variant="h4" fontWeight={700}>Sessions</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
                View your current session details or browse all session history & analytics
            </Typography>

            {/* Tabs */}
            <Tabs
                value={tab}
                onChange={handleTabChange}
                sx={{
                    mb: 3,
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
                    '& .Mui-selected': { color: '#5c6bc0' },
                    '& .MuiTabs-indicator': { backgroundColor: '#5c6bc0' },
                }}
            >
                <Tab label="Recent Session" />
                <Tab label="All Sessions" />
            </Tabs>

            {/* Tab Content */}
            {tab === 0 && (
                <RecentSessionTab
                    sessionId={sessionId}
                    isLive={isLive}
                    onStop={handleStop}
                    stopping={stopping}
                />
            )}
            {tab === 1 && (
                <AllSessionsTab
                    sessions={sessions}
                    appEvents={appEvents}
                    navigate={navigate}
                />
            )}
        </Container>
    )
}

export default SessionsPage
