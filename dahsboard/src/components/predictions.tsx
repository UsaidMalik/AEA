import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

// Define the type for a prediction
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
    return <Typography>Loading predictions...</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Predictions</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp Generated</TableCell>
                <TableCell>Risk Flags</TableCell>
                <TableCell>Focus Forecast</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {predictions.map((prediction, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(prediction.ts_generated).toLocaleString()}</TableCell>
                  <TableCell>
                    {prediction.models?.risk_flags ? prediction.models.risk_flags.join(', ') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {prediction.models?.focus_forecast ? 
                      prediction.models.focus_forecast.map(f => (f * 100).toFixed(2) + '%').join(', ') : 'N/A'}
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