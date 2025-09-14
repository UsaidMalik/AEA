import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface WebEvent {
  session_id: string;
  ts_open: string;
  ts_close: string;
  domain: string;
  url_hash: string;
  policy: { allowed: boolean; rule: string };
  action_taken: string;
  notification: { sent: boolean; ts: string };
  affect: { label: string; confidence: number };
  schema_version: number;
}

const WebTable: React.FC = () => {
  const [webData, setWebData] = useState<WebEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWebData = async () => {
      try {
        const response = await fetch('/api/web?page=1&limit=10');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setWebData(data.data);
      } catch (error) {
        console.error("Failed to fetch web data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWebData();
  }, []);

  if (loading) {
    return <Typography>Loading web data...</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Web Activity</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Domain</TableCell>
                <TableCell>Policy</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Affect</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webData.map((web, index) => (
                <TableRow key={index}>
                  <TableCell>{web.domain}</TableCell>
                  <TableCell>{web.policy.allowed ? 'Allowed' : 'Denied'}</TableCell>
                  <TableCell>{new Date(web.ts_open).toLocaleString()}</TableCell>
                  <TableCell>{web.action_taken}</TableCell>
                  <TableCell>{web.affect?.label || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default WebTable;