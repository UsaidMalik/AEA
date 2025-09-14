// Interventions.tsx
import React from 'react';
import { Card, CardContent, Typography, Stack, Chip } from '@mui/material';

interface Intervention {
  session_id: string;
  ts: string;
  nudge_type: string;
  trigger_reason: string;
  action_payload: any;
  user_response: string;
  follow_up_result: string;
  latency_ms: number;
}

interface Props {
  data?: Intervention[];
}

const mockInterventions: Intervention[] = [
  {
    session_id: "uuid-v4",
    ts: "2025-09-13T09:18:00Z",
    nudge_type: "toast",
    trigger_reason: "web_deny",
    action_payload: { domain: "instagram.com", rule: "deny" },
    user_response: "clicked",
    follow_up_result: "success",
    latency_ms: 742
  }
];

const Interventions: React.FC<Props> = ({ data = mockInterventions }) => (
  <Card style={{ marginBottom: 20 }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>Interventions</Typography>
      <Stack spacing={2}>
        {data.map((iv, idx) => (
          <Card key={idx} variant="outlined">
            <CardContent>
              <Typography><strong>Time:</strong> {new Date(iv.ts).toLocaleTimeString()}</Typography>
              <Typography><strong>Nudge:</strong> {iv.nudge_type}</Typography>
              <Typography><strong>Reason:</strong> {iv.trigger_reason}</Typography>
              <Typography><strong>Response:</strong> {iv.user_response} | <strong>Result:</strong> {iv.follow_up_result}</Typography>
              <Typography><strong>Latency:</strong> {iv.latency_ms} ms</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

export default Interventions;
