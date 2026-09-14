import axiosInstance from "../api/axiosInstance";
import type {
  AdminUserListItem,
  AdminUserProfile,
  AdminUserResource,
  AdminUserForumActivity,
  AdminUserApplication,
  PaginatedMeta,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  AdminUserOpportunity,
} from "../types/adminUser";

interface Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface SubListParams {
  page?: number;
  pageSize?: number;
  type?: "post" | "comment";
}

export const adminUserService = {
  async create(input: CreateAdminUserInput): Promise<AdminUserProfile> {
    const res = await axiosInstance.post<{ data: AdminUserProfile }>("/admin/users", input);
    return res.data.data;
  },

  async update(userId: string, input: UpdateAdminUserInput): Promise<AdminUserProfile> {
    const res = await axiosInstance.patch<{ data: AdminUserProfile }>(`/admin/users/${userId}`, input);
    return res.data.data;
  },

  async updateStatus(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<AdminUserProfile> {
    const res = await axiosInstance.patch<{ data: AdminUserProfile }>(`/admin/users/${userId}/status`, { status });
    return res.data.data;
  },

  async list(params: ListParams): Promise<Paginated<AdminUserListItem>> {
    const res = await axiosInstance.get<Paginated<AdminUserListItem>>(
      "/admin/users",
      { params },
    );
    return res.data;
  },

  async getProfile(userId: string): Promise<AdminUserProfile> {
    const res = await axiosInstance.get<{ data: AdminUserProfile }>(
      `/admin/users/${userId}`,
    );
    return res.data.data;
  },

  async getResources(
    userId: string,
    params: SubListParams,
  ): Promise<Paginated<AdminUserResource>> {
    const res = await axiosInstance.get<Paginated<AdminUserResource>>(
      `/admin/users/${userId}/resources`,
      { params },
    );
    return res.data;
  },

  async getForumActivity(
    userId: string,
    params: SubListParams,
  ): Promise<Paginated<AdminUserForumActivity>> {
    const res = await axiosInstance.get<Paginated<AdminUserForumActivity>>(
      `/admin/users/${userId}/forum`,
      { params },
    );
    return res.data;
  },

  async getApplications(
    userId: string,
    params: SubListParams,
  ): Promise<Paginated<AdminUserApplication>> {
    const res = await axiosInstance.get<Paginated<AdminUserApplication>>(
      `/admin/users/${userId}/applications`,
      { params },
    );
    return res.data;
  },

  async disable(
    userId: string,
    data: { until?: string; reason: string },
  ): Promise<AdminUserProfile> {
    const res = await axiosInstance.post<{ data: AdminUserProfile }>(
      `/admin/users/${userId}/disable`,
      data,
    );
    return res.data.data;
  },

  async enable(userId: string): Promise<AdminUserProfile> {
    const res = await axiosInstance.post<{ data: AdminUserProfile }>(
      `/admin/users/${userId}/enable`,
    );
    return res.data.data;
  },

  async remove(userId: string, data: { reason: string }): Promise<void> {
    await axiosInstance.delete(`/admin/users/${userId}`, { data });
  },

  async getOpportunities(userId: string, listingType: "TUTORING" | "PROJECT_MENTORSHIP", params: SubListParams): Promise<Paginated<AdminUserOpportunity>> {
    const res = await axiosInstance.get<Paginated<AdminUserOpportunity>>(`/admin/users/${userId}/opportunities/${listingType}`, { params });
    return res.data;
  },
};
