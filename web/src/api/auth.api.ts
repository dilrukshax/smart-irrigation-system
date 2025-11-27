/**
 * Auth Service API
 * Handles all authentication and admin user management API calls
 * All requests go through the API Gateway
 */

import { apiClient } from './index';
import { AUTH_TOKEN_KEY } from '@config/constants';

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

// Auth API endpoints - via Gateway
const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
};

const ADMIN_ENDPOINTS = {
  USERS: '/admin/users',
  USER: (id: string) => `/admin/users/${id}`,
  USER_ROLE: (id: string) => `/admin/users/${id}/role`,
  USER_STATUS: (id: string) => `/admin/users/${id}/status`,
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

// Admin API functions
export const adminApi = {
  /**
   * Create a new user (admin only)
   */
  createUser: async (userData: AdminUserCreate): Promise<User> => {
    const response = await apiClient.post<User>(ADMIN_ENDPOINTS.USERS, userData);
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

    const response = await apiClient.get<UserListResponse>(
      `${ADMIN_ENDPOINTS.USERS}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a single user by ID (admin only)
   */
  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(ADMIN_ENDPOINTS.USER(userId));
    return response.data;
  },

  /**
   * Update user details (admin only)
   */
  updateUser: async (userId: string, userData: AdminUserUpdate): Promise<User> => {
    const response = await apiClient.put<User>(
      ADMIN_ENDPOINTS.USER(userId),
      userData
    );
    return response.data;
  },

  /**
   * Update user roles (admin only)
   */
  updateUserRoles: async (userId: string, roles: string[]): Promise<User> => {
    const response = await apiClient.patch<User>(
      ADMIN_ENDPOINTS.USER_ROLE(userId),
      { roles }
    );
    return response.data;
  },

  /**
   * Update user active status (admin only)
   */
  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await apiClient.patch<User>(
      ADMIN_ENDPOINTS.USER_STATUS(userId),
      { is_active: isActive }
    );
    return response.data;
  },

  /**
   * Delete user (admin only)
   */
  deleteUser: async (userId: string, hardDelete: boolean = false): Promise<void> => {
    await apiClient.delete(
      `${ADMIN_ENDPOINTS.USER(userId)}?hard_delete=${hardDelete}`
    );
  },
};

export default apiClient;
