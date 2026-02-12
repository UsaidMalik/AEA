import {useState} from 'react'
import { Container, Typography, Stack, TextField, Button } from '@mui/material';
import {useUser} from '../context/UserContext.tsx'
import { useNavigate } from 'react-router-dom';


const WelcomePage = () => {
    const [name, setName] = useState('');
    const { setUserName } = useUser();
    const navigate = useNavigate();

    const handleContinue = () => {
        if(name.trim()){
            setUserName(name.trim());
            navigate('/home');
        }
    }

    const handleGuest = () => {
        setUserName('Guest');
        navigate('/home');
    }

    return (
        <Container maxWidth="sm" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography variant="h3" fontWeight={700}>Welcome to AEA Platform</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>What should we call you?</Typography>
        <TextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            placeholder="Enter your name"
            sx={{ mt: 2, width: 300 }}
        />
        <Button variant="contained" onClick={handleContinue} disabled={!name.trim()} sx={{ mt: 2 }}>
            Continue
        </Button>
        <p className= "text-sm text-gray-500 mt-4">Or{''}</p>
        <Button variant="text" onClick={handleGuest} sx={{ mt: 1 }}>
            Continue as Guest
        </Button>
        </Container> 
    )

}

export default WelcomePage;

