import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Box } from '@mui/material';

interface Intervention {
  session_id: string;
  ts: string;
  nudge_type: string;
  trigger_reason: string;
  action_payload: object;
  user_response: string;
  follow_up_result: string;
  latency_ms: number;
  schema_version: number;
}

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const;
const stripedRow = {
  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
  '&:hover': { bgcolor: 'action.selected' },
  transition: 'background-color 0.15s',
} as const;

const responseColor = (response: string) => {
  switch (response) {
    case 'clicked': return 'success';
    case 'dismissed': return 'warning';
    case 'ignored': return 'error';
    default: return 'default';
  }
};

const Interventions: React.FC<{ sessionId?: string }> = ({ sessionId }) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        const url = sessionId
          ? `/api/interventions?session_id=${sessionId}&page=1&limit=10`
          : '/api/interventions?page=1&limit=10';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setInterventions(data.data);
      } catch (error) {
        console.error("Failed to fetch interventions data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInterventions();
  }, [sessionId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Interventions</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Timestamp</TableCell>
                <TableCell sx={headerSx}>Nudge Type</TableCell>
                <TableCell sx={headerSx}>Trigger</TableCell>
                <TableCell sx={headerSx}>Response</TableCell>
                <TableCell sx={headerSx}>Latency</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interventions.map((item, index) => (
                <TableRow key={index} sx={stripedRow}>
                  <TableCell>{new Date(item.ts).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Chip label={item.nudge_type} color="primary" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{item.trigger_reason}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.user_response}
                      color={responseColor(item.user_response)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.latency_ms}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default Interventions;
