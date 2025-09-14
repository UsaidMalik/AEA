import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

// Define the type for a configuration
interface Config {
  name: string;
  json: object;
  source: string;
  prompt: string;
  created_ts: string;
  updated_ts: string;
  schema_version: number;
}

const Configs: React.FC = () => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await fetch('/api/configs?page=1&limit=10');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setConfigs(data.data);
      } catch (error) {
        console.error("Failed to fetch configs data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  if (loading) {
    return <Typography>Loading configurations...</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>Configurations</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Config Name</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config, index) => (
                <TableRow key={index}>
                  <TableCell>{config.name}</TableCell>
                  <TableCell>{config.source}</TableCell>
                  <TableCell>{new Date(config.created_ts).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default Configs;