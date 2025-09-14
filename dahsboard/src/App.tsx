import React, { useState, useEffect } from 'react';
import { Container, Typography, Stack, TextField, Button, CircularProgress, Box } from '@mui/material';

import SessionOverview from './components/sessionOverview';
import AppsTable from './components/appsTable';
import WebTable from './components/webTable';
import CameraEvents from './components/cameraEvents';
import Interventions from './components/interventions';
import Configs from './components/configs';
import PredictionsComponent from './components/predictions';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [ollamaResponse, setOllamaResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
      const fetchSession = async () => {
          try {
              const response = await fetch('/api/sessions?page=1&limit=1');
              const data = await response.json();
              if (data.data && data.data.length > 0) {
                  setSessionId(data.data[0].session_id);
              }
          } catch (error) {
              console.error("Failed to fetch session ID:", error);
          }
      };
      fetchSession();
  }, []);

  const handleSearch = async () => {
    if (!query || !sessionId) return;
    setIsLoading(true);
    setOllamaResponse('');
    
    const requestBody = {
      question: query,
      session_id: sessionId
    };

    try {
      const response = await fetch('/api/llm/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Ollama');
      }

      const data = await response.json();
      setOllamaResponse(data.response);
    } catch (error) {
      console.error("Search error:", error);
      setOllamaResponse('Error: Could not get a response from the AI.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h3" gutterBottom align="center">
        📊 Focus Dashboard
      </Typography>
      
      <Box sx={{ width: '100%', mb: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>Ask the AI Assistant</Typography>
        <TextField
          label="Enter your query"
          variant="outlined"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          sx={{ mb: 2 }}
        />
        <Button 
          variant="contained" 
          onClick={handleSearch} 
          disabled={isLoading || !sessionId}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Search'}
        </Button>
      </Box>

      {ollamaResponse && (
        <Box sx={{ width: '100%', my: 4, p: 2, border: '1px solid #ccc', borderRadius: '8px' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{ollamaResponse}</Typography>
        </Box>
      )}

      <Stack spacing={4} sx={{ width: '100%' }}>
        <SessionOverview />
        <AppsTable />
        <WebTable />
        <CameraEvents />
        <Interventions />
        <Configs />
        <PredictionsComponent />
      </Stack>
    </Container>
  );
};
export default App;
