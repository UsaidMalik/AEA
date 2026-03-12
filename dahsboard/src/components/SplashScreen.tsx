import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'

interface Props {
    onDone: () => void
}

const SplashScreen = ({ onDone }: Props) => {
    const [splitting, setSplitting] = useState(false)

    useEffect(() => {
        const split = setTimeout(() => setSplitting(true), 2800)
        const done  = setTimeout(onDone, 3700)
        return () => { clearTimeout(split); clearTimeout(done) }
    }, [onDone])

    const panel = {
        position: 'absolute' as const,
        left: 0, right: 0,
        height: '50%',
        bgcolor: '#0f172a',
        transition: 'transform 0.9s cubic-bezier(0.76, 0, 0.24, 1)',
        zIndex: 2,
    }

    return (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', pointerEvents: 'none' }}>

            {/* Logo + text — sits between the two panels in the centre */}
            <Box sx={{
                position: 'absolute', inset: 0, zIndex: 3,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                bgcolor: '#0f172a',
                opacity: splitting ? 0 : 1,
                transition: 'opacity 0.4s ease',
            }}>
                <Box sx={{
                    width: 96, height: 96, borderRadius: '24px',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 48px rgba(37,99,235,0.45)',
                }}>
                    <MonitorHeart sx={{ fontSize: 56, color: 'white' }} />
                </Box>

                <Typography variant="h3" fontWeight={800} sx={{
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                }}>
                    AEA
                </Typography>

                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                    Productivity enforcement for focused sessions
                </Typography>
            </Box>

            {/* Top panel — slides up */}
            <Box sx={{
                ...panel,
                top: 0,
                transform: splitting ? 'translateY(-100%)' : 'translateY(0)',
            }} />

            {/* Bottom panel — slides down */}
            <Box sx={{
                ...panel,
                bottom: 0,
                transform: splitting ? 'translateY(100%)' : 'translateY(0)',
            }} />

        </Box>
    )
}

export default SplashScreen
