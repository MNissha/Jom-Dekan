import axiosInstance from '../api/axiosInstance';
import type { ActivityItem, Profile, ProfileStats, PublicProfile, UpdateProfileInput } from '../types/profile';

export const profileService = {
  getMe: async (): Promise<Profile> => {
    const response = await axiosInstance.get<{ data: Profile }>('/users/me');
    return response.data.data;
  },

  getById: async (id: string): Promise<PublicProfile> => {
    const response = await axiosInstance.get<{ data: PublicProfile }>(`/users/${id}`);
    return response.data.data;
  },

  updateMe: async (data: UpdateProfileInput): Promise<Profile> => {
    const response = await axiosInstance.patch<{ data: Profile }>('/users/me', data);
    return response.data.data;
  },

  getMyStats: async (): Promise<ProfileStats> => {
    const response = await axiosInstance.get<{ data: ProfileStats }>('/users/me/stats');
    return response.data.data;
  },

  getMyActivity: async (): Promise<ActivityItem[]> => {
    const response = await axiosInstance.get<{ data: ActivityItem[] }>('/users/me/activity');
    return response.data.data;
  },
};
