// SessionOverview.tsx
import React from 'react';
import { Card, CardContent, Typography, Chip, Stack } from '@mui/material';

// Define violation structure
interface Violations {
  web: number;
  app: number;
  affect: number;
}

// Define stats structure
interface Stats {
  focus_pct: number;
  away_secs: number;
  violations: Violations;
}

// Define session structure
interface Session {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  config_name: string;
  stats: Stats;
}

// Mock session data for testing
const mockSession: Session = {
  session_id: "uuid-v4",
  user_id: "user-123",
  started_at: "2025-09-13T09:00:00Z",
  ended_at: "2025-09-13T11:00:00Z",
  config_name: "study_default",
  stats: {
    focus_pct: 0.78, // 78% focused
    away_secs: 420,  // seconds away from screen
    violations: { web: 3, app: 1, affect: 2 } // number of violations
  }
};

// Props for the component, data is optional
interface Props {
  data?: Session;
}

// Functional component
const SessionOverview: React.FC<Props> = ({ data = mockSession }) => {

  // Helper function to format ISO date to local time
  const formatTime = (isoStr: string) => new Date(isoStr).toLocaleTimeString();

  return (
    // Outer card container
    <Card style={{ marginBottom: 20 }}>
      <CardContent>
        {/* Heading */}
        <Typography variant="h5" gutterBottom>
          Session Overview
        </Typography>

        {/* Basic session info */}
        <Typography><strong>Session ID:</strong> {data.session_id}</Typography>
        <Typography><strong>User:</strong> {data.user_id}</Typography>
        <Typography><strong>Config:</strong> {data.config_name}</Typography>
        <Typography>
          <strong>Start:</strong> {formatTime(data.started_at)} | <strong>End:</strong> {formatTime(data.ended_at)}
        </Typography>
        <Typography><strong>Focus %:</strong> {(data.stats.focus_pct * 100).toFixed(1)}%</Typography>
        <Typography><strong>Away Time:</strong> {data.stats.away_secs} sec</Typography>

        {/* Row of violation chips using Stack */}
        <Stack direction="row" spacing={1} mt={2}>
          <Chip label={`Web Violations: ${data.stats.violations.web}`} color="error" />
          <Chip label={`App Violations: ${data.stats.violations.app}`} color="warning" />
          <Chip label={`Affect Violations: ${data.stats.violations.affect}`} color="secondary" />
        </Stack>

      </CardContent>
    </Card>
  );
};

// Export component
export default SessionOverview;
