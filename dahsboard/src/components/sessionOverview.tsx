import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography } from '@mui/material';

// Define the type for the session data
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
        <Typography>Session ID: {session.session_id}</Typography>
        <Typography>User ID: {session.user_id}</Typography>
        <Typography>Started At: {new Date(session.started_at).toLocaleString()}</Typography>
        <Typography>Ended At: {new Date(session.ended_at).toLocaleString()}</Typography>
        <Typography>Focus Percentage: {(session.stats.focus_pct * 100).toFixed(2)}%</Typography>
        <Typography>Away Seconds: {session.stats.away_secs}</Typography>
      </CardContent>
    </Card>
  );
};

export default SessionOverview;