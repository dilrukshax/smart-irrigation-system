/**
 * Auth Service API
 * Handles all authentication and admin user management API calls
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AUTH_SERVICE_URL, AUTH_TOKEN_KEY } from '@config/constants';

// Types
export interface User {
  id: string;
  username: string;
  email?: string;
  roles: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    roles: string[];
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserRoleUpdate {
  roles: string[];
}

export interface UserStatusUpdate {
  is_active: boolean;
}

export interface AdminUserCreate {
  username: string;
  password: string;
  email?: string;
  roles?: string[];
  is_active?: boolean;
}

export interface AdminUserUpdate {
  username?: string;
  email?: string;
  password?: string;
  roles?: string[];
  is_active?: boolean;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiError {
  detail: string;
}

// Create axios instance for auth service
const authApiClient: AxiosInstance = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
authApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
authApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('refreshToken');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authApi = {
  /**
   * Login user and get tokens
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await authApiClient.post<LoginResponse>(
      '/api/auth/login',
      credentials
    );
    return response.data;
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await authApiClient.post<User>(
      '/api/auth/register',
      data
    );
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await authApiClient.post<RefreshTokenResponse>(
      '/api/auth/refresh',
      { refresh_token: refreshToken }
    );
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await authApiClient.get<User>('/api/auth/me');
    return response.data;
  },
};

// Admin API functions
export const adminApi = {
  /**
   * Create a new user (admin only)
   */
  createUser: async (userData: AdminUserCreate): Promise<User> => {
    const response = await authApiClient.post<User>('/api/admin/users', userData);
    return response.data;
  },

  /**
   * Get paginated list of users (admin only)
   */
  getUsers: async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    isActive?: boolean
  ): Promise<UserListResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('is_active', isActive.toString());

    const response = await authApiClient.get<UserListResponse>(
      `/api/admin/users?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single user by ID (admin only)
   */
  getUser: async (userId: string): Promise<User> => {
    const response = await authApiClient.get<User>(`/api/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Update user details (admin only)
   */
  updateUser: async (userId: string, userData: AdminUserUpdate): Promise<User> => {
    const response = await authApiClient.put<User>(
      `/api/admin/users/${userId}`,
      userData
    );
    return response.data;
  },

  /**
   * Update user roles (admin only)
   */
  updateUserRoles: async (userId: string, roles: string[]): Promise<User> => {
    const response = await authApiClient.patch<User>(
      `/api/admin/users/${userId}/role`,
      { roles }
    );
    return response.data;
  },

  /**
   * Update user active status (admin only)
   */
  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await authApiClient.patch<User>(
      `/api/admin/users/${userId}/status`,
      { is_active: isActive }
    );
    return response.data;
  },

  /**
   * Delete user (admin only)
   */
  deleteUser: async (userId: string, hardDelete: boolean = false): Promise<void> => {
    await authApiClient.delete(
      `/api/admin/users/${userId}?hard_delete=${hardDelete}`
    );
  },
};

export default authApiClient;
