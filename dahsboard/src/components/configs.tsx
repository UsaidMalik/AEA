import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Box } from '@mui/material';

interface Config {
  name: string;
  json: object;
  source: string;
  prompt: string;
  created_ts: string;
  updated_ts: string;
  schema_version: number;
}

const headerSx = { fontWeight: 700, bgcolor: 'action.hover' } as const;
const stripedRow = {
  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
  '&:hover': { bgcolor: 'action.selected' },
  transition: 'background-color 0.15s',
} as const;

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
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Configurations</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Config Name</TableCell>
                <TableCell sx={headerSx}>Source</TableCell>
                <TableCell sx={headerSx}>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config, index) => (
                <TableRow key={index} sx={stripedRow}>
                  <TableCell sx={{ fontWeight: 500 }}>{config.name}</TableCell>
                  <TableCell>
                    <Chip label={config.source} color="info" size="small" variant="outlined" />
                  </TableCell>
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
