import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@contexts/AuthContext';
import { ROUTES } from '@config/routes';

export default function AuthorityLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    try {
      const user = await login(username, password);
      if (!user.roles.includes('authority')) {
        logout();
        setError('This account does not have authority access.');
        return;
      }
      navigate(ROUTES.AUTHORITY.USERS, { replace: true });
    } catch (loginError) {
      if (loginError instanceof Error) {
        setError(loginError.message || 'Authority sign-in failed');
        return;
      }
      setError('Authority sign-in failed');
    }
  };

  return (
    <Card sx={{ width: '100%', maxWidth: 420 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Authority Login
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in with an authority account to manage users, policy, and approvals.
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
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            margin="normal"
            autoFocus
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label="Password"
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
                Signing in...
              </>
            ) : (
              'Authority Sign In'
            )}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Farmer access?{' '}
          <Link component={RouterLink} to={ROUTES.FARMER.LANDING}>
            Go to Farmer Portal
          </Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
