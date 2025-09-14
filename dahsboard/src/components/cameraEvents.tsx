// CameraEvents.tsx
import React from 'react';
import { Card, CardContent, Typography, Stack, Chip } from '@mui/material';

interface CameraEvent {
  session_id: string;
  ts: string;
  presence: { state: string; confidence: number };
  posture: { indicator: string; confidence: number };
  affect: { label: string; confidence: number };
}

interface Props {
  data?: CameraEvent[];
}

const mockCamera: CameraEvent[] = [
  {
    session_id: "uuid-v4",
    ts: "2025-09-13T09:15:00Z",
    presence: { state: "present", confidence: 0.97 },
    posture: { indicator: "slouch", confidence: 0.66 },
    affect: { label: "happy", confidence: 0.88 }
  }
];

const CameraEvents: React.FC<Props> = ({ data = mockCamera }) => (
  <Card style={{ marginBottom: 20 }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>Camera Events</Typography>
      <Stack spacing={2}>
        {data.map((event, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Typography><strong>Timestamp:</strong> {new Date(event.ts).toLocaleTimeString()}</Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip label={`Presence: ${event.presence.state}`} color="success" />
                <Chip label={`Posture: ${event.posture.indicator}`} color="warning" />
                <Chip label={`Emotion: ${event.affect.label}`} color="secondary" />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

export default CameraEvents;
