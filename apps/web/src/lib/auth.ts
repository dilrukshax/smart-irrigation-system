/**
 * Auth Module
 *
 * Handles JWT token storage, login/logout, and provides useAuth hook
 * for client-side authentication state management.
 */

import { apiPost } from './api';
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken as getStoredRefreshToken,
  getStoredUser,
  saveAuthSession,
} from './auth-storage';

export interface User {
  id: string;
  username: string;
  full_name?: string | null;
  national_id?: string | null;
  phone_number?: string | null;
  email?: string | null;
  roles: string[];
  scheme_ids?: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

/**
 * Login with username and password
 */
export async function login(username: string, password: string): Promise<User> {
  const response = await apiPost<TokenResponse>('/auth/login', {
    username,
    password,
  });

  saveAuthSession(response.access_token, response.refresh_token, response.user);

  return response.user;
}

/**
 * Logout and clear all auth state
 */
export function logout(): void {
  clearAuthSession();

  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

/**
 * Get stored user from localStorage
 */
export function getUser(): User | null {
  return getStoredUser<User>();
}

/**
 * Get stored JWT token
 */
export function getToken(): string | null {
  return getAccessToken();
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  return getStoredRefreshToken();
}

/**
 * Check if user has a specific role
 */
export function isRole(role: string): boolean {
  const user = getUser();
  if (!user) return false;
  return user.roles.some((r) => r.toLowerCase() === role.toLowerCase());
}

/**
 * Check if user has any of the given roles
 */
export function hasAnyRole(roles: string[]): boolean {
  const user = getUser();
  if (!user) return false;
  return user.roles.some((r) =>
    roles.some((role) => r.toLowerCase() === role.toLowerCase())
  );
}

/**
 * Get user's scheme IDs
 */
export function getSchemeIds(): string[] {
  const user = getUser();
  return user?.scheme_ids || [];
}

/**
 * React hook for auth state
 */
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate auth state from browser storage only after mount to keep SSR output stable.
    queueMicrotask(() => {
      const storedUser = getUser();
      setUser(storedUser);
      setToken(getToken());
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    token,
    isAuthenticated: !!user,
    logout,
    isRole,
    hasAnyRole,
  };
}
