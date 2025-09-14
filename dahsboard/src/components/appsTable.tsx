// AppsTable.tsx
import React from 'react';
import { Card, CardContent, Typography, Stack, Chip } from '@mui/material';

interface AppRecord {
  session_id: string;
  ts_open: string;
  ts_close: string;
  app_name: string;
  window_title: string;
  policy: { allowed: boolean; rule: string };
  action_taken: string;
}

interface Props {
  data?: AppRecord[];
}

const mockApps: AppRecord[] = [
  {
    session_id: "uuid-v4",
    ts_open: "2025-09-13T09:05:00Z",
    ts_close: "2025-09-13T09:45:00Z",
    app_name: "chrome.exe",
    window_title: "Stack Overflow — Code",
    policy: { allowed: true, rule: "app_allow" },
    action_taken: "notified"
  }
];

const AppsTable: React.FC<Props> = ({ data = mockApps }) => {
  return (
    <Card style={{ marginBottom: 20 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>Apps Usage</Typography>
        <Stack spacing={2}>
          {data.map((app, index) => (
            <Card key={index} variant="outlined">
              <CardContent>
                <Typography><strong>App:</strong> {app.app_name}</Typography>
                <Typography><strong>Window:</strong> {app.window_title}</Typography>
                <Typography>
                  <strong>Open:</strong> {new Date(app.ts_open).toLocaleTimeString()} | 
                  <strong>Close:</strong> {new Date(app.ts_close).toLocaleTimeString()}
                </Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <Chip label={`Allowed: ${app.policy.allowed}`} color={app.policy.allowed ? "success" : "error"} />
                  <Chip label={`Rule: ${app.policy.rule}`} color="primary" />
                  <Chip label={`Action: ${app.action_taken}`} color="warning" />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AppsTable;
