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
          primary: { main: '#1976d2' },
        },
        shape: { borderRadius: 12 },
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
