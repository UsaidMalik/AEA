import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

// Define the type for an intervention
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

const Interventions: React.FC = () => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterventions = async () => {
      try {
        const response = await fetch('/api/interventions?page=1&limit=10');
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
  }, []);

  if (loading) {
    return <Typography>Loading interventions...</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Interventions</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Nudge Type</TableCell>
                <TableCell>Trigger Reason</TableCell>
                <TableCell>User Response</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interventions.map((intervention, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(intervention.ts).toLocaleString()}</TableCell>
                  <TableCell>{intervention.nudge_type}</TableCell>
                  <TableCell>{intervention.trigger_reason}</TableCell>
                  <TableCell>{intervention.user_response}</TableCell>
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