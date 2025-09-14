import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface CameraEvent {
  session_id: string;
  ts: string;
  presence: { state: string; confidence: number };
  posture: { indicator: string; confidence: number };
  affect: { label: string; confidence: number };
  schema_version: number;
}

const CameraEvents: React.FC = () => {
  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameraEvents = async () => {
      try {
        const response = await fetch('/api/camera-events?page=1&limit=10');
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
  }, []);

  if (loading) {
    return <Typography>Loading camera events...</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Camera Events</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Presence</TableCell>
                <TableCell>Posture</TableCell>
                <TableCell>Affect</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cameraEvents.map((event, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(event.ts).toLocaleString()}</TableCell>
                  <TableCell>{event.presence?.state || 'N/A'}</TableCell>
                  <TableCell>{event.posture?.indicator || 'N/A'}</TableCell>
                  <TableCell>{event.affect?.label || 'N/A'}</TableCell>
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