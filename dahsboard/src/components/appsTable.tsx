import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

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
    return <Typography>Loading app data...</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Apps Used</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>App Name</TableCell>
                <TableCell>Window Title</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apps.map((app, index) => (
                <TableRow key={index}>
                  <TableCell>{app.app_name}</TableCell>
                  <TableCell>{app.window_title}</TableCell>
                  <TableCell>{new Date(app.ts_open).toLocaleString()}</TableCell>
                  <TableCell>{app.action_taken}</TableCell>
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