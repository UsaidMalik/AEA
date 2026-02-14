import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Stack, Box, Chip, CircularProgress } from '@mui/material';
import FocusChart from './focusChart';

interface Session {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  config_name: string;
  web_policy: { allow: string[]; deny: string[]; wildcard: boolean };
  app_policy: { allow: string[]; deny: string[] };
  vision_policy: { require_presence: boolean; away_grace_sec: number };
  stats: {
    focus_pct: number;
    away_secs: number;
    violations: { web: number; app: number; affect: number };
  };
  schema_version: number;
}

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <Box sx={{
    textAlign: 'center',
    p: 2,
    borderRadius: 2,
    bgcolor: 'action.hover',
    minWidth: 100,
    flex: 1,
  }}>
    <Typography variant="h4" sx={{ fontWeight: 700, color: color || 'text.primary' }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
      {label}
    </Typography>
  </Box>
);

const SessionOverview: React.FC<{ sessionId?: string }> = ({ sessionId }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const url = sessionId
          ? `/api/sessions?session_id=${sessionId}&limit=1`
          : '/api/sessions?page=1&limit=1';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSession(data.data?.[0] || null);
      } catch (error) {
        console.error("Failed to fetch session data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  if (!session) {
    return <Typography>No session data available.</Typography>;
  }

  const stats = session.stats || { focus_pct: 0, away_secs: 0, violations: { web: 0, app: 0, affect: 0 } };
  const violations = stats.violations || { web: 0, app: 0, affect: 0 };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
  };

  const totalViolations = violations.web + violations.app + violations.affect;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Session Overview</Typography>
          <Chip label={session.config_name} color="primary" size="small" variant="outlined" />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Left: Stats grid */}
          <Box sx={{ flex: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <StatCard label="Focus" value={`${(stats.focus_pct * 100).toFixed(0)}%`} color="success.main" />
              <StatCard label="Away Time" value={formatDuration(stats.away_secs)} />
              <StatCard label="Violations" value={totalViolations} color={totalViolations > 0 ? 'error.main' : 'success.main'} />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip label={`Web: ${violations.web}`} color={violations.web > 0 ? 'error' : 'success'} size="small" />
              <Chip label={`App: ${violations.app}`} color={violations.app > 0 ? 'error' : 'success'} size="small" />
              <Chip label={`Affect: ${violations.affect}`} color={violations.affect > 0 ? 'warning' : 'success'} size="small" />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Started: {new Date(session.started_at).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ended: {new Date(session.ended_at).toLocaleString()}
            </Typography>
          </Box>

          {/* Right: Focus chart */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FocusChart focus_pct={stats.focus_pct} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SessionOverview;
