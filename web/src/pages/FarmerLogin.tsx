import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useAuth } from '@contexts/AuthContext';
import { ROUTES } from '@config/routes';

type LanguageCode = 'en' | 'si' | 'ta';

type FarmerLoginCopy = {
  title: string;
  subtitle: string;
  languageLabel: string;
  usernameLabel: string;
  passwordLabel: string;
  submitLabel: string;
  loadingLabel: string;
  registerPrompt: string;
  registerLink: string;
  homePrompt: string;
  homeLink: string;
  missingCredentials: string;
  invalidRole: string;
  fallbackError: string;
};

const FARMER_PORTAL_LANGUAGE_KEY = 'farmerPortalLanguage';

const COPY: Record<LanguageCode, FarmerLoginCopy> = {
  en: {
    title: 'Farmer Sign In',
    subtitle: 'Sign in with your farmer account to access the portal.',
    languageLabel: 'Language',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    submitLabel: 'Farmer Sign In',
    loadingLabel: 'Signing in...',
    registerPrompt: 'New farmer?',
    registerLink: 'Register here',
    homePrompt: 'Need the homepage with both panels?',
    homeLink: 'Open landing page',
    missingCredentials: 'Please enter username and password.',
    invalidRole: 'This account is not registered as a farmer.',
    fallbackError: 'Farmer sign-in failed.',
  },
  si: {
    title: 'ගොවි පිවිසුම',
    subtitle: 'ද්වාරයට ප්‍රවේශ වීමට ඔබගේ ගොවි ගිණුමෙන් පිවිසෙන්න.',
    languageLabel: 'භාෂාව',
    usernameLabel: 'පරිශීලක නාමය',
    passwordLabel: 'මුරපදය',
    submitLabel: 'ගොවි ලෙස පිවිසෙන්න',
    loadingLabel: 'පිවිසෙමින්...',
    registerPrompt: 'අලුත් ගොවියෙක්ද?',
    registerLink: 'මෙහි ලියාපදිංචි වන්න',
    homePrompt: 'ලොගින් පැනල් දෙකම ඇති මුල් පිටුව අවශ්‍යද?',
    homeLink: 'Landing පිටුව විවෘත කරන්න',
    missingCredentials: 'කරුණාකර පරිශීලක නාමය සහ මුරපදය ඇතුළත් කරන්න.',
    invalidRole: 'මෙම ගිණුම ගොවි ගිණුමක් ලෙස ලියාපදිංචි වී නොමැත.',
    fallbackError: 'ගොවි පිවිසුම අසාර්ථක විය.',
  },
  ta: {
    title: 'விவசாயி உள்நுழைவு',
    subtitle: 'போர்டலை அணுக உங்கள் விவசாயி கணக்கில் உள்நுழைக.',
    languageLabel: 'மொழி',
    usernameLabel: 'பயனர் பெயர்',
    passwordLabel: 'கடவுச்சொல்',
    submitLabel: 'விவசாயியாக உள்நுழைக',
    loadingLabel: 'உள்நுழைகிறது...',
    registerPrompt: 'புதிய விவசாயியா?',
    registerLink: 'இங்கே பதிவு செய்யவும்',
    homePrompt: 'இரண்டு உள்நுழைவு பலகைகளுடன் முகப்பு வேண்டுமா?',
    homeLink: 'முகப்பு பக்கத்தை திறக்கவும்',
    missingCredentials: 'பயனர் பெயர் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.',
    invalidRole: 'இந்த கணக்கு விவசாயி கணக்காக பதிவு செய்யப்படவில்லை.',
    fallbackError: 'விவசாயி உள்நுழைவு தோல்வியடைந்தது.',
  },
};

export default function FarmerLogin() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const savedLanguage = localStorage.getItem(FARMER_PORTAL_LANGUAGE_KEY);
    return savedLanguage === 'si' || savedLanguage === 'ta' ? savedLanguage : 'en';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const copy = COPY[language];

  useEffect(() => {
    localStorage.setItem(FARMER_PORTAL_LANGUAGE_KEY, language);
  }, [language]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!username || !password) {
      setError(copy.missingCredentials);
      return;
    }

    try {
      const user = await login(username, password);
      if (!user.roles.includes('farmer')) {
        logout();
        setError(copy.invalidRole);
        return;
      }
      navigate(ROUTES.FARMER.ROOT, { replace: true });
    } catch (loginError) {
      if (loginError instanceof Error) {
        setError(loginError.message || copy.fallbackError);
        return;
      }
      setError(copy.fallbackError);
    }
  };

  return (
    <Card sx={{ width: '100%', maxWidth: 460 }}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="h5" fontWeight={600}>
            {copy.title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {copy.languageLabel}
            </Typography>
            <ToggleButtonGroup
              size="small"
              value={language}
              exclusive
              onChange={(_, value: LanguageCode | null) => {
                if (value) {
                  setLanguage(value);
                }
              }}
            >
              <ToggleButton value="en">EN</ToggleButton>
              <ToggleButton value="si">SI</ToggleButton>
              <ToggleButton value="ta">TA</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {copy.subtitle}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={copy.usernameLabel}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            margin="normal"
            autoFocus
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label={copy.passwordLabel}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            margin="normal"
            disabled={isLoading}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                {copy.loadingLabel}
              </>
            ) : (
              copy.submitLabel
            )}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {copy.registerPrompt}{' '}
          <Link component={RouterLink} to={ROUTES.FARMER.REGISTER}>
            {copy.registerLink}
          </Link>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
          {copy.homePrompt}{' '}
          <Link component={RouterLink} to="/">
            {copy.homeLink}
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
