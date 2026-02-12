import { useState, useEffect } from 'react'
import {
    Container, Typography, Card, CardContent, Box, Grid,
    CircularProgress, MenuItem, TextField, Avatar, Chip,
} from '@mui/material'
import {
    Timeline, People, AccessTime, TrendingUp,
    CalendarToday,
} from '@mui/icons-material'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar,
} from 'recharts'

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

const PIE_COLORS = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#607d8b']

const statCardStyles = [
    { icon: <Timeline />, color: '#5c6bc0', bg: '#e8eaf6', badge: '+12%', badgeColor: '#4caf50' },
    { icon: <People />, color: '#4caf50', bg: '#e8f5e9', badge: '+8%', badgeColor: '#4caf50' },
    { icon: <AccessTime />, color: '#7c4dff', bg: '#f3e5f5', badge: '-5%', badgeColor: '#ff9800' },
    { icon: <TrendingUp />, color: '#ff9800', bg: '#fff3e0', badge: '+3%', badgeColor: '#4caf50' },
]

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

const SessionsPage = () => {
    const [sessions, setSessions] = useState<Session[]>([])
    const [appEvents, setAppEvents] = useState<AppEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [timeFilter, setTimeFilter] = useState('week')

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

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>
    }

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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Session History & Analytics</Typography>
                    <Typography variant="body2" color="text.secondary">
                        View completed sessions and analyze historical data
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
            </Box>

            {/* Stat Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
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
            <Grid container spacing={2} sx={{ mb: 3 }}>
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
                                <BarChart data={durationData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="minutes" fill="#4caf50" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card {...chartCard}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} mb={2}>Policy Violations</Typography>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={violationsData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={120} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#f44336" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}

export default SessionsPage
