/**
 * API Client Module
 *
 * Provides typed fetch wrappers for all API calls to the backend gateway.
 * Automatically injects JWT authentication headers and handles session expiry.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
const AUTH_REFRESH_PATH = '/auth/refresh';

import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
} from './auth-storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Core fetch function with auth injection and error handling.
 */
interface ApiFetchOptions extends RequestInit {
  token?: string;
  retryOnUnauthorized?: boolean;
}

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

const NO_REFRESH_PATHS = new Set(['/auth/login', AUTH_REFRESH_PATH]);
let refreshPromise: Promise<string | null> | null = null;

function shouldAttemptRefresh(path: string): boolean {
  return !NO_REFRESH_PATHS.has(path);
}

async function requestTokenRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${BASE_URL}${AUTH_REFRESH_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const refreshed = await response.json() as RefreshTokenResponse;
  if (!refreshed.access_token || !refreshed.refresh_token) {
    return null;
  }

  updateAccessToken(refreshed.access_token, refreshed.refresh_token);
  return refreshed.access_token;
}

async function getRefreshedAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function redirectToLogin(): never {
  clearAuthSession();
  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
  throw new ApiError(401, 'Session expired');
}

async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = options?.token ?? getAccessToken();
  const retryOnUnauthorized = options?.retryOnUnauthorized ?? true;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && shouldAttemptRefresh(path) && retryOnUnauthorized) {
      const refreshedToken = await getRefreshedAccessToken();
      if (refreshedToken && refreshedToken !== token) {
        return apiFetch<T>(path, {
          ...options,
          token: refreshedToken,
          retryOnUnauthorized: false,
        });
      }
    }

    if (response.status === 401 && shouldAttemptRefresh(path)) {
      redirectToLogin();
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        errorMessage = data.detail || data.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new ApiError(response.status, errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * GET request
 */
export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET', token });
}

/**
 * POST request
 */
export async function apiPost<T>(
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    token,
  });
}

/**
 * PATCH request
 */
export async function apiPatch<T>(
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    token,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T>(
  path: string,
  token?: string
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'DELETE',
    token,
  });
}

/**
 * PUT request
 */
export async function apiPut<T>(
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    token,
  });
}

/**
 * File upload (FormData) request
 */
export async function uploadFile<T>(
  path: string,
  file: File,
  token?: string
): Promise<T> {
  async function uploadFileWithRetry(
    activeToken: string | null,
    retryOnUnauthorized: boolean
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401 && shouldAttemptRefresh(path) && retryOnUnauthorized) {
        const refreshedToken = await getRefreshedAccessToken();
        if (refreshedToken && refreshedToken !== activeToken) {
          return uploadFileWithRetry(refreshedToken, false);
        }
      }

      if (response.status === 401 && shouldAttemptRefresh(path)) {
        redirectToLogin();
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          errorMessage = data.detail || data.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new ApiError(response.status, errorMessage);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return uploadFileWithRetry(token ?? getAccessToken(), true);
}
