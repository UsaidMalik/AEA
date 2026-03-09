import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery } from '@mui/material'
import './index.css'
import {BrowserRouter} from 'react-router-dom'
import { UserProvider } from './context/UserContext.tsx'

import App from './App.tsx'

function Root() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDark ? 'dark' : 'light',
          primary: { main: '#2563eb' },
          secondary: { main: '#7c3aed' },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h3: { fontWeight: 800, letterSpacing: '-0.5px' },
          h4: { fontWeight: 700, letterSpacing: '-0.3px' },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 600 },
        },
      }),
    [prefersDark]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <UserProvider>
          <App />
        </UserProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
