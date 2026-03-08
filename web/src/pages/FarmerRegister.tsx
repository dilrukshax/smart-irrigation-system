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
import { useNotification } from '@contexts/NotificationContext';
import { ROUTES } from '@config/routes';

type LanguageCode = 'en' | 'si' | 'ta';

type FarmerRegisterCopy = {
  title: string;
  subtitle: string;
  languageLabel: string;
  usernameLabel: string;
  emailLabel: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  submitLabel: string;
  loadingLabel: string;
  signinPrompt: string;
  signinLink: string;
  homePrompt: string;
  homeLink: string;
  validationRequired: string;
  validationUsername: string;
  validationPassword: string;
  validationPasswordMismatch: string;
  successMessage: string;
  fallbackError: string;
};

const FARMER_PORTAL_LANGUAGE_KEY = 'farmerPortalLanguage';

const COPY: Record<LanguageCode, FarmerRegisterCopy> = {
  en: {
    title: 'Farmer Registration',
    subtitle: 'Create your farmer account to use the Smart Irrigation system.',
    languageLabel: 'Language',
    usernameLabel: 'Username',
    emailLabel: 'Email (Optional)',
    passwordLabel: 'Password',
    confirmPasswordLabel: 'Confirm Password',
    submitLabel: 'Register Farmer Account',
    loadingLabel: 'Creating account...',
    signinPrompt: 'Already registered?',
    signinLink: 'Sign in',
    homePrompt: 'Need the combined homepage?',
    homeLink: 'Open landing page',
    validationRequired: 'Please fill in all required fields.',
    validationUsername: 'Username must be at least 3 characters.',
    validationPassword: 'Password must be at least 6 characters.',
    validationPasswordMismatch: 'Passwords do not match.',
    successMessage: 'Farmer registration successful! Please sign in.',
    fallbackError: 'Farmer registration failed.',
  },
  si: {
    title: 'ගොවි ලියාපදිංචිය',
    subtitle: 'ස්මාර්ට් වාරිමාර්ග පද්ධතිය භාවිතා කිරීමට ඔබගේ ගොවි ගිණුම සාදන්න.',
    languageLabel: 'භාෂාව',
    usernameLabel: 'පරිශීලක නාමය',
    emailLabel: 'විද්‍යුත් තැපෑල (විකල්ප)',
    passwordLabel: 'මුරපදය',
    confirmPasswordLabel: 'මුරපදය තහවුරු කරන්න',
    submitLabel: 'ගොවි ගිණුම ලියාපදිංචි කරන්න',
    loadingLabel: 'ගිණුම සෑදෙමින්...',
    signinPrompt: 'දැනටමත් ලියාපදිංචි වී තිබේද?',
    signinLink: 'පිවිසෙන්න',
    homePrompt: 'එක්ම තැනක ලොගින් පැනල් ඇති මුල් පිටුව අවශ්‍යද?',
    homeLink: 'Landing පිටුව විවෘත කරන්න',
    validationRequired: 'අවශ්‍ය සියලු ක්ෂේත්‍ර පුරවන්න.',
    validationUsername: 'පරිශීලක නාමය අක්ෂර 3 කට වඩා වැඩි විය යුතුය.',
    validationPassword: 'මුරපදය අක්ෂර 6 කට වඩා වැඩි විය යුතුය.',
    validationPasswordMismatch: 'මුරපද දෙක නොගැලපේ.',
    successMessage: 'ගොවි ලියාපදිංචිය සාර්ථකයි! කරුණාකර පිවිසෙන්න.',
    fallbackError: 'ගොවි ලියාපදිංචිය අසාර්ථක විය.',
  },
  ta: {
    title: 'விவசாயி பதிவு',
    subtitle: 'ஸ்மார்ட் நீர்ப்பாசன அமைப்பை பயன்படுத்த உங்கள் விவசாயி கணக்கை உருவாக்கவும்.',
    languageLabel: 'மொழி',
    usernameLabel: 'பயனர் பெயர்',
    emailLabel: 'மின்னஞ்சல் (விருப்பம்)',
    passwordLabel: 'கடவுச்சொல்',
    confirmPasswordLabel: 'கடவுச்சொல் உறுதிப்படுத்தல்',
    submitLabel: 'விவசாயி கணக்கை பதிவு செய்யவும்',
    loadingLabel: 'கணக்கு உருவாக்கப்படுகிறது...',
    signinPrompt: 'ஏற்கனவே பதிவு செய்துள்ளீர்களா?',
    signinLink: 'உள்நுழைக',
    homePrompt: 'இரண்டு உள்நுழைவு பலகைகள் உள்ள முகப்பு வேண்டுமா?',
    homeLink: 'முகப்பு பக்கத்தை திறக்கவும்',
    validationRequired: 'அனைத்து தேவையான புலங்களையும் நிரப்பவும்.',
    validationUsername: 'பயனர் பெயர் குறைந்தது 3 எழுத்துகள் இருக்க வேண்டும்.',
    validationPassword: 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.',
    validationPasswordMismatch: 'கடவுச்சொற்கள் பொருந்தவில்லை.',
    successMessage: 'விவசாயி பதிவு வெற்றி! தயவுசெய்து உள்நுழைக.',
    fallbackError: 'விவசாயி பதிவு தோல்வியடைந்தது.',
  },
};

export default function FarmerRegister() {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const savedLanguage = localStorage.getItem(FARMER_PORTAL_LANGUAGE_KEY);
    return savedLanguage === 'si' || savedLanguage === 'ta' ? savedLanguage : 'en';
  });
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();
  const copy = COPY[language];

  useEffect(() => {
    localStorage.setItem(FARMER_PORTAL_LANGUAGE_KEY, language);
  }, [language]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!username || !password || !confirmPassword) {
      setError(copy.validationRequired);
      return;
    }
    if (username.length < 3) {
      setError(copy.validationUsername);
      return;
    }
    if (password.length < 6) {
      setError(copy.validationPassword);
      return;
    }
    if (password !== confirmPassword) {
      setError(copy.validationPasswordMismatch);
      return;
    }

    try {
      await register(username, password, email || undefined, 'farmer');
      showSuccess(copy.successMessage);
      navigate(ROUTES.FARMER.LOGIN, { replace: true });
    } catch (registerError) {
      if (registerError instanceof Error) {
        setError(registerError.message || copy.fallbackError);
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
            label={copy.emailLabel}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            margin="normal"
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
          <TextField
            fullWidth
            label={copy.confirmPasswordLabel}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
          {copy.signinPrompt}{' '}
          <Link component={RouterLink} to={ROUTES.FARMER.LOGIN}>
            {copy.signinLink}
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
