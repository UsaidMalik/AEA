// Predictions.tsx
import React from 'react';
import { Card, CardContent, Typography, Stack, Chip } from '@mui/material';

interface Predictions {
  session_id: string;
  ts_generated: string;
  models: {
    focus_forecast: number[];
    optimal_schedule: { slots: string[] };
    risk_flags: string[];
  };
}

interface Props {
  data?: Predictions[];
}

const mockPredictions: Predictions[] = [
  {
    session_id: "uuid-v4",
    ts_generated: "2025-09-13T09:00:00Z",
    models: { 
      focus_forecast: [0.82, 0.79, 0.68],
      optimal_schedule: { slots: ["9–11AM", "2–4PM"] },
      risk_flags: ["fatigue", "repetition"]
    }
  }
];

const PredictionsComponent: React.FC<Props> = ({ data = mockPredictions }) => (
  <Card style={{ marginBottom: 20 }}>
    <CardContent>
      <Typography variant="h5" gutterBottom>Predictions</Typography>
      <Stack spacing={2}>
        {data.map((p, idx) => (
          <Card key={idx} variant="outlined">
            <CardContent>
              <Typography><strong>Generated:</strong> {new Date(p.ts_generated).toLocaleString()}</Typography>
              <Typography><strong>Focus Forecast:</strong> {p.models.focus_forecast.map(f => (f*100).toFixed(1)).join('% , ')}%</Typography>
              <Typography><strong>Optimal Slots:</strong> {p.models.optimal_schedule.slots.join(', ')}</Typography>
              <Typography><strong>Risk Flags:</strong> {p.models.risk_flags.join(', ')}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

export default PredictionsComponent;
