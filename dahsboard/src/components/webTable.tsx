import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Box } from '@mui/material';

interface WebEvent {
  session_id: string;
  ts_open: string;
  ts_close: string;
  domain: string;
  url_hash: string;
  policy: { allowed: boolean; rule: string };
  action_taken: string;
  notification: { sent: boolean; ts: string };
  affect: { label: string; confidence: number };
  schema_version: number;
}

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const;
const stripedRow = {
  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
  '&:hover': { bgcolor: 'action.selected' },
  transition: 'background-color 0.15s',
} as const;

const affectColor = (label: string) => {
  switch (label) {
    case 'happy': return 'success';
    case 'neutral': return 'default';
    case 'distressed': return 'warning';
    default: return 'default';
  }
};

const WebTable: React.FC<{ sessionId?: string }> = ({ sessionId }) => {
  const [webData, setWebData] = useState<WebEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebData = async () => {
      try {
        const url = sessionId
          ? `/api/web?session_id=${sessionId}&page=1&limit=10`
          : '/api/web?page=1&limit=10';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setWebData(data.data);
      } catch (error) {
        console.error("Failed to fetch web data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWebData();
  }, [sessionId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Web Activity</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Domain</TableCell>
                <TableCell sx={headerSx}>Policy</TableCell>
                <TableCell sx={headerSx}>Timestamp</TableCell>
                <TableCell sx={headerSx}>Action</TableCell>
                <TableCell sx={headerSx}>Affect</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webData.map((web, index) => (
                <TableRow key={index} sx={stripedRow}>
                  <TableCell sx={{ fontWeight: 500 }}>{web.domain}</TableCell>
                  <TableCell>
                    <Chip
                      label={web.policy?.allowed ? 'Allowed' : 'Denied'}
                      color={web.policy?.allowed ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(web.ts_open).toLocaleTimeString()}</TableCell>
                  <TableCell>{web.action_taken}</TableCell>
                  <TableCell>
                    <Chip
                      label={web.affect?.label || 'N/A'}
                      color={affectColor(web.affect?.label)}
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

export default WebTable;
