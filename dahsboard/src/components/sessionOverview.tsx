import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Stack } from '@mui/material';
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

const SessionOverview: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/sessions?page=1&limit=1');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSession(data.data[0]);
      } catch (error) {
        console.error("Failed to fetch session data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  if (loading) {
    return <Typography>Loading session data...</Typography>;
  }
  
  if (!session) {
    return <Typography>No session data available.</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Session Overview</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Card variant="outlined" sx={{ p: 2, flexGrow: 1 }}>
            <Typography variant="body1">Session ID: {session.session_id}</Typography>
            <Typography variant="body1">User ID: {session.user_id}</Typography>
            <Typography variant="body1">Started: {new Date(session.started_at).toLocaleString()}</Typography>
            <Typography variant="body1">Ended: {new Date(session.ended_at).toLocaleString()}</Typography>
            <Typography variant="body1">Away Time: {session.stats.away_secs}s</Typography>
          </Card>
          <FocusChart focus_pct={session.stats.focus_pct} />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SessionOverview;