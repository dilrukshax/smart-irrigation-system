/**
 * Authentication Context
 * Manages user authentication state, tokens, and auth operations
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@config/constants';
import { authApi, LoginResponse } from '@api/auth.api';

// User type for context
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  is_active: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  register: (
    username: string,
    password: string,
    email?: string,
    role?: 'user' | 'farmer'
  ) => Promise<void>;
  fetchCurrentUser: () => Promise<AuthUser | null>;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
  isFarmer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: { detail?: string } } }).response;
    const detail = maybeResponse?.data?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail;
    }
  }
  return fallback;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Fetch current user from API
   */
  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsInitialized(true);
      return null;
    }

    try {
      setIsLoading(true);
      const userData = await authApi.getCurrentUser();
      const authUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        roles: userData.roles,
        is_active: userData.is_active,
      };
      setUser(authUser);
      return authUser;
    } catch (error) {
      // Token is invalid or expired
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  /**
   * Initialize auth state on app load
   */
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  /**
   * Login with username and password
   */
  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response: LoginResponse = await authApi.login({ username, password });

      // Store tokens
      localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);

      // Fetch full user data
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        throw new Error('Login succeeded but user profile could not be loaded.');
      }
      return currentUser;
    } catch (error) {
      // Clear any existing tokens on failed login
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);

      // Re-throw with better error message
      throw new Error(getErrorMessage(error, 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  /**
   * Register new user
   */
  const register = useCallback(
    async (
      username: string,
      password: string,
      email?: string,
      role: 'user' | 'farmer' = 'user'
    ) => {
      setIsLoading(true);
      try {
        await authApi.register({ username, password, email, role });
        // Don't auto-login, let user login manually
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Registration failed. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false;
      return user.roles.includes(role);
    },
    [user]
  );

  /**
   * Check if user is admin
   */
  const isAdmin = user?.roles.includes('admin') ?? false;
  const isFarmer = user?.roles.includes('farmer') ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitialized,
        login,
        logout,
        register,
        fetchCurrentUser,
        hasRole,
        isAdmin,
        isFarmer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
