import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUserService } from "../service/adminUserService";
import type { CreateAdminUserInput, UpdateAdminUserInput } from "../types/adminUser";

export function useAdminUserMutations() {
  const queryClient = useQueryClient();
  const refreshUsers = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  const createUser = useMutation({ mutationFn: (input: CreateAdminUserInput) => adminUserService.create(input), onSuccess: refreshUsers });
  const updateUser = useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateAdminUserInput }) => adminUserService.update(id, input), onSuccess: refreshUsers });
  return { createUser, updateUser };
}

export function useAdminUsersList(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["admin", "users", "list", params],
    queryFn: () => adminUserService.list(params),
  });
}

export function useAdminUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "users", "profile", userId],
    queryFn: () => adminUserService.getProfile(userId!),
    enabled: Boolean(userId),
  });
}

export function useAdminUserResources(
  userId: string | undefined,
  params: { page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: ["admin", "users", "resources", userId, params],
    queryFn: () => adminUserService.getResources(userId!, params),
    enabled: Boolean(userId),
  });
}

export function useAdminUserForumActivity(
  userId: string | undefined,
  params: { page?: number; pageSize?: number; type?: "post" | "comment" },
) {
  return useQuery({
    queryKey: ["admin", "users", "forum", userId, params],
    queryFn: () => adminUserService.getForumActivity(userId!, params),
    enabled: Boolean(userId),
  });
}

export function useAdminUserApplications(
  userId: string | undefined,
  params: { page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: ["admin", "users", "applications", userId, params],
    queryFn: () => adminUserService.getApplications(userId!, params),
    enabled: Boolean(userId),
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, until, reason }: { userId: string; until?: string; reason: string }) =>
      adminUserService.disable(userId, { until, reason }),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "profile", userId] });
    },
  });
}

export function useEnableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminUserService.enable(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "profile", userId] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminUserService.remove(userId, { reason }),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "profile", userId] });
    },
  });
}

export function useAdminUserOpportunities(userId: string | undefined, listingType: "TUTORING" | "PROJECT_MENTORSHIP", params: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["admin", "users", "opportunities", userId, listingType, params],
    queryFn: () => adminUserService.getOpportunities(userId!, listingType, params),
    enabled: Boolean(userId),
  });
}
