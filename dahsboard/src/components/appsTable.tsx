import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Box } from '@mui/material';

interface AppEvent {
  session_id: string;
  ts_open: string;
  ts_close: string;
  app_name: string;
  window_title: string;
  policy: { allowed: boolean; rule: string };
  action_taken: string;
  notification: { sent: boolean; ts: string };
  schema_version: number;
}

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const;
const stripedRow = {
  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
  '&:hover': { bgcolor: 'action.selected' },
  transition: 'background-color 0.15s',
} as const;

const AppsTable: React.FC = () => {
  const [apps, setApps] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await fetch('/api/apps?page=1&limit=10');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setApps(data.data);
      } catch (error) {
        console.error("Failed to fetch app data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Apps Used</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>App Name</TableCell>
                <TableCell sx={headerSx}>Window Title</TableCell>
                <TableCell sx={headerSx}>Status</TableCell>
                <TableCell sx={headerSx}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((app, index) => (
                <TableRow key={index} sx={stripedRow}>
                  <TableCell sx={{ fontWeight: 500 }}>{app.app_name}</TableCell>
                  <TableCell>{app.window_title}</TableCell>
                  <TableCell>
                    <Chip
                      label={app.policy?.allowed ? 'Allowed' : 'Blocked'}
                      color={app.policy?.allowed ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={app.action_taken}
                      color={app.action_taken === 'blocked' ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default AppsTable;
