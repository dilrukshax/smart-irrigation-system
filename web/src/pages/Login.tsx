import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { ROUTES } from '@config/routes';

type AnnouncementLanguage = 'en' | 'si' | 'ta';

const FARMER_LOGIN_ANNOUNCEMENTS: Record<AnnouncementLanguage, string> = {
  en: 'New Farmer Portal is live. Check current field details, water budget, and run quick simulations.',
  si: 'නව ගොවි ද්වාරය දැන් සජීවීයි. වත්මන් කෙත් තොරතුරු, ජල අයවැය සහ ඉක්මන් simulation පරීක්ෂා කරන්න.',
  ta: 'புதிய விவசாயி போர்டல் இப்போது செயல்பாட்டில் உள்ளது. தற்போதைய புல தகவல்கள், நீர் பட்ஜெட் மற்றும் விரைவு simulation-களை பார்க்கவும்.',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { showInfo } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    try {
      const authenticatedUser = await login(username, password);
      const defaultRoute = authenticatedUser.roles.includes('farmer')
        ? ROUTES.FARMER.ROOT
        : ROUTES.HOME;
      const nextRoute = from && from !== ROUTES.LOGIN ? from : defaultRoute;

      if (authenticatedUser.roles.includes('farmer')) {
        const toastKey = 'farmerPortalLoginAnnouncementShown';
        if (localStorage.getItem(toastKey) !== 'true') {
          const storedLanguage = localStorage.getItem('farmerPortalLanguage');
          const language: AnnouncementLanguage =
            storedLanguage === 'si' || storedLanguage === 'ta' ? storedLanguage : 'en';
          showInfo(FARMER_LOGIN_ANNOUNCEMENTS[language]);
          localStorage.setItem(toastKey, 'true');
        }
      }

      navigate(nextRoute, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Invalid credentials');
        return;
      }
      setError('Invalid credentials');
    }
  };

  return (
    <Card sx={{ width: '100%', maxWidth: 400 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
          Sign In
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your credentials to access the platform
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            autoComplete="username"
            autoFocus
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            autoComplete="current-password"
            disabled={isLoading}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link component={RouterLink} to={ROUTES.REGISTER}>
                Register here
              </Link>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
