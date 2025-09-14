// Configs.tsx
import React from 'react';
import { Card, CardContent, Typography, Stack, Chip } from '@mui/material';

interface Config {
  name: string;
  json: any;
  source: string;
  prompt: string;
  created_ts: string;
  updated_ts: string;
}

interface Props {
  data?: Config[];
}

const mockConfigs: Config[] = [
  {
    name: "essay_mode_1",
    json: { action: "write_essay", apps: { allow: ["notepad.exe"], deny: ["discord.exe"] } },
    source: "llm",
    prompt: "I'm writing an essay, block distractions",
    created_ts: "2025-09-13T09:00:00Z",
    updated_ts: "2025-09-13T09:00:00Z"
  }
];

const Configs: React.FC<Props> = ({ data = mockConfigs }) => (
  <Card style={{ marginBottom: 20 }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>Configurations</Typography>
      <Stack spacing={2}>
        {data.map((cfg, idx) => (
          <Card key={idx} variant="outlined">
            <CardContent>
              <Typography><strong>Name:</strong> {cfg.name}</Typography>
              <Typography><strong>Source:</strong> {cfg.source}</Typography>
              <Typography><strong>Prompt:</strong> {cfg.prompt}</Typography>
              <Typography><strong>Created:</strong> {new Date(cfg.created_ts).toLocaleString()}</Typography>
              <Typography><strong>Updated:</strong> {new Date(cfg.updated_ts).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

export default Configs;
