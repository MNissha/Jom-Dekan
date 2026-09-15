import axiosInstance from '../api/axiosInstance';
import type { AuthResponse, User } from '../types/auth';

/**
 * Components/pages never call Axios directly — every API call goes
 * through a service file like this one, consumed via hooks/TanStack
 * Query.
 */
export const authService = {
  register: async (data: {
    email: string;
    password: string;
    displayName: string;
    academicRole: 'STUDENT' | 'TUTOR';
    universityId: string;
    fieldOfStudy: string;
    currentYear: number;
    currentSemester: number;
    termsAccepted: boolean;
  }): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  verifyEmail: async (data: { token: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/auth/verify-email', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post('/auth/logout');
  },

  refresh: async (): Promise<{ accessToken: string; user: User }> => {
    const response = await axiosInstance.post<{ accessToken: string; user: User }>('/auth/refresh');
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await axiosInstance.get<{ user: User }>('/auth/me');
    return response.data;
  },

  forgotPassword: async (data: { email: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: { token: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>('/auth/reset-password', data);
    return response.data;
  },
};
