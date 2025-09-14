import React from 'react';
import {Container, Typography, Stack} from '@mui/material';

import SessionOverview from './components/sessionOverview';
import AppsTable from './components/appsTable';
import WebTable from './components/webTable';
import CameraEvents from './components/cameraEvents';
import Interventions from './components/interventions';
import Configs from './components/configs';
import PredictionsComponent from './components/predictions';

const App: React.FC =() => {
  return (
    <Container maxWidth="lg" sx={{padding: 4}}>
      {/* Big Heading at the Top of the Page */}
      <Typography variant= "h3" gutterBottom>
        📊 Focus Dashboard
      </Typography>
      {/* Stack Vertical Listing with the spacing */}
      <Stack spacing={4}>
        {/*Each Card is one schema section */}
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
