// WebTable.tsx
import React from 'react';
import { Card, CardContent, Typography, Stack, Chip } from '@mui/material';

interface WebRecord {
  session_id: string;
  ts_open: string;
  ts_close: string;
  domain: string;
  url_hash: string;
  policy: { allowed: boolean; rule: string };
  action_taken: string;
  affect: { label: string; confidence: number };
}

interface Props {
  data?: WebRecord[];
}

const mockWeb: WebRecord[] = [
  {
    session_id: "uuid-v4",
    ts_open: "2025-09-13T09:10:00Z",
    ts_close: "2025-09-13T09:20:00Z",
    domain: "instagram.com",
    url_hash: "abcdef123456",
    policy: { allowed: false, rule: "web_deny" },
    action_taken: "blocked",
    affect: { label: "distressed", confidence: 0.71 }
  }
];

const WebTable: React.FC<Props> = ({ data = mockWeb }) => (
  <Card style={{ marginBottom: 20 }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>Website Visits</Typography>
      <Stack spacing={2}>
        {data.map((web, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Typography><strong>Domain:</strong> {web.domain}</Typography>
              <Typography>
                <strong>Open:</strong> {new Date(web.ts_open).toLocaleTimeString()} |
                <strong>Close:</strong> {new Date(web.ts_close).toLocaleTimeString()}
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip label={`Allowed: ${web.policy.allowed}`} color={web.policy.allowed ? "success" : "error"} />
                <Chip label={`Rule: ${web.policy.rule}`} color="primary" />
                <Chip label={`Action: ${web.action_taken}`} color="warning" />
                <Chip label={`Emotion: ${web.affect.label} (${(web.affect.confidence*100).toFixed(0)}%)`} color="secondary" />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

export default WebTable;
