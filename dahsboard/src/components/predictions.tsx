import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Stack, CircularProgress, Box } from '@mui/material';

interface Prediction {
  session_id: string;
  ts_generated: string;
  models: {
    focus_forecast: number[];
    optimal_schedule: { slots: string[] };
    risk_flags: string[];
  };
  input_span: {
    start: string;
    end: string;
  };
  schema_version: number;
}

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const;
const stripedRow = {
  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
  '&:hover': { bgcolor: 'action.selected' },
  transition: 'background-color 0.15s',
} as const;

const PredictionsComponent: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await fetch('/api/predictions?page=1&limit=10');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPredictions(data.data);
      } catch (error) {
        console.error("Failed to fetch predictions data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Predictions</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Generated</TableCell>
                <TableCell sx={headerSx}>Risk Flags</TableCell>
                <TableCell sx={headerSx}>Forecast</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {predictions.map((prediction, index) => (
                <TableRow key={index} sx={stripedRow}>
                  <TableCell>{new Date(prediction.ts_generated).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {prediction.models?.risk_flags?.map((flag, i) => (
                        <Chip key={i} label={flag} color="warning" size="small" />
                      )) || 'N/A'}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {prediction.models?.focus_forecast?.map(f => `${(f * 100).toFixed(0)}%`).join(', ') || 'N/A'}
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

export default PredictionsComponent;
