import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Box } from '@mui/material';

interface CameraEvent {
  session_id: string;
  ts: string;
  presence: { state: string; confidence: number };
  posture: { indicator: string; confidence: number };
  affect: { label: string; confidence: number };
  schema_version: number;
}

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const;
const stripedRow = {
  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
  '&:hover': { bgcolor: 'action.selected' },
  transition: 'background-color 0.15s',
} as const;

const presenceColor = (state: string) => {
  switch (state) {
    case 'present': return 'success';
    case 'away': return 'warning';
    default: return 'default';
  }
};

const postureColor = (indicator: string) => {
  switch (indicator) {
    case 'upright': return 'success';
    case 'slouch': return 'warning';
    default: return 'default';
  }
};

const affectColor = (label: string) => {
  switch (label) {
    case 'neutral': return 'info';
    case 'happy': return 'success';
    case 'distressed': return 'warning';
    case 'angry': return 'error';
    default: return 'default';
  }
};

const CameraEvents: React.FC<{ sessionId?: string }> = ({ sessionId }) => {
  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameraEvents = async () => {
      try {
        const url = sessionId
          ? `/api/camera-events?session_id=${sessionId}&page=1&limit=10`
          : '/api/camera-events?page=1&limit=10';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCameraEvents(data.data);
      } catch (error) {
        console.error("Failed to fetch camera event data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCameraEvents();
  }, [sessionId]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Camera Events</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Timestamp</TableCell>
                <TableCell sx={headerSx}>Presence</TableCell>
                <TableCell sx={headerSx}>Posture</TableCell>
                <TableCell sx={headerSx}>Affect</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cameraEvents.map((event, index) => (
                <TableRow key={index} sx={stripedRow}>
                  <TableCell>{new Date(event.ts).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={event.presence?.state || 'N/A'}
                      color={presenceColor(event.presence?.state)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.posture?.indicator || 'N/A'}
                      color={postureColor(event.posture?.indicator)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.affect?.label || 'N/A'}
                      color={affectColor(event.affect?.label)}
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

export default CameraEvents;
