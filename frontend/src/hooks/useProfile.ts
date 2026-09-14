import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../service/profileService';
import type { UpdateProfileInput } from '../types/profile';
import { useCurrentUser } from './useAuth';

export function useMyProfile() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileService.getMe,
    enabled: Boolean(currentUser),
  });
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileService.getById(userId!),
    enabled: Boolean(userId),
  });
}

export function useMyStats() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: ['profile', 'me', 'stats'],
    queryFn: profileService.getMyStats,
    enabled: Boolean(currentUser),
  });
}

export function useMyActivity() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: ['profile', 'me', 'activity'],
    queryFn: profileService.getMyActivity,
    enabled: Boolean(currentUser),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileInput) => profileService.updateMe(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
  });
}
