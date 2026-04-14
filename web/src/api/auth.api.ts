/**
 * Auth Service API
 * Handles authentication and authority user-management API calls
 * All requests go through the API Gateway
 */

import { apiClient } from './index';
import { AUTH_TOKEN_KEY } from '@config/constants';

// Types
export interface User {
  id: string;
  username: string;
  email?: string;
  roles: Array<'farmer' | 'officer' | 'authority'>;
  is_active: boolean;
  scheme_ids?: string[];
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
    roles: Array<'farmer' | 'officer' | 'authority'>;
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  role?: 'farmer';
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
  roles?: Array<'farmer' | 'officer' | 'authority'>;
  is_active?: boolean;
  scheme_ids?: string[];
}

export interface AdminUserUpdate {
  username?: string;
  email?: string;
  password?: string;
  roles?: Array<'farmer' | 'officer' | 'authority'>;
  is_active?: boolean;
  scheme_ids?: string[];
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

// Auth API endpoints - via Gateway
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
};

const AUTHORITY_ENDPOINTS = {
  USERS: '/authority/users',
  USER: (id: string) => `/authority/users/${id}`,
  USER_ROLE: (id: string) => `/authority/users/${id}/roles`,
  USER_STATUS: (id: string) => `/authority/users/${id}/status`,
  USER_SCHEMES: (id: string) => `/authority/users/${id}/schemes`,
};

// Auth API functions
export const authApi = {
  /**
   * Login user and get tokens
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      AUTH_ENDPOINTS.LOGIN,
      credentials
    );
    return response.data;
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>(
      AUTH_ENDPOINTS.REGISTER,
      data
    );
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>(
      AUTH_ENDPOINTS.REFRESH,
      { refresh_token: refreshToken }
    );
    return response.data;
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>(AUTH_ENDPOINTS.ME);
    return response.data;
  },
};

// Authority API functions
export const authorityApi = {
  /**
   * Create a new user (authority only)
   */
  createUser: async (userData: AdminUserCreate): Promise<User> => {
    const response = await apiClient.post<User>(AUTHORITY_ENDPOINTS.USERS, userData);
    return response.data;
  },

  /**
   * Get paginated list of users (authority only)
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

    const response = await apiClient.get<UserListResponse>(
      `${AUTHORITY_ENDPOINTS.USERS}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single user by ID (authority only)
   */
  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(AUTHORITY_ENDPOINTS.USER(userId));
    return response.data;
  },

  /**
   * Update user details (authority only)
   */
  updateUser: async (userId: string, userData: AdminUserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(
      AUTHORITY_ENDPOINTS.USER(userId),
      userData
    );
    return response.data;
  },

  /**
   * Update user roles (authority only)
   */
  updateUserRoles: async (userId: string, roles: string[]): Promise<User> => {
    const response = await apiClient.patch<User>(
      AUTHORITY_ENDPOINTS.USER_ROLE(userId),
      { roles }
    );
    return response.data;
  },

  /**
   * Update user active status (authority only)
   */
  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await apiClient.patch<User>(
      AUTHORITY_ENDPOINTS.USER_STATUS(userId),
      { is_active: isActive }
    );
    return response.data;
  },

  /**
   * Replace user scheme assignments (authority only)
   */
  setUserSchemes: async (userId: string, schemeIds: string[]): Promise<User> => {
    const response = await apiClient.put<User>(
      AUTHORITY_ENDPOINTS.USER_SCHEMES(userId),
      { scheme_ids: schemeIds }
    );
    return response.data;
  },

  /**
   * Delete user (authority only)
   */
  deleteUser: async (userId: string, hardDelete: boolean = false): Promise<void> => {
    await apiClient.delete(
      `${AUTHORITY_ENDPOINTS.USER(userId)}?hard_delete=${hardDelete}`
    );
  },
};

// Backward-compatibility alias during cutover.
export const adminApi = authorityApi;

export default apiClient;
