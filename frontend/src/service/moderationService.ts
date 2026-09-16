import axiosInstance from "../api/axiosInstance";
import type { Notification, ReportResolutionPayload } from "../types/moderation";

export const moderationService = {
  async getNotifications() {
    const { data } = await axiosInstance.get("/notifications");
    return data.data as Notification[];
  },
  async markNotificationAsRead(id: string) {
    const { data } = await axiosInstance.patch(`/notifications/${id}/read`);
    return data.data;
  },
  async markAllNotificationsAsRead() {
    const { data } = await axiosInstance.patch("/notifications/read-all");
    return data.data as { updatedCount: number };
  },
  async sendAnnouncement(input: {
    title: string;
    message: string;
    sendToAll: boolean;
    userIds: string[];
  }) {
    const { data } = await axiosInstance.post("/admin/notifications", input);
    return data.data as { recipientCount: number };
  },
  async getModerationQueue() {
    const { data } = await axiosInstance.get("/admin/moderation/queue");
    return data.data;
  },
  async getReportEvidence(reportId: string) {
    const response = await axiosInstance.get<Blob>(
      `/reports/${reportId}/evidence`,
      { responseType: "blob" },
    );
    return response.data;
  },
  async handleModerationAction(
    targetType: string,
    id: string,
    action: string,
    reason: string,
    resolution?: ReportResolutionPayload,
  ) {
    const { data } = await axiosInstance.patch(
      `/admin/${targetType}/${id}/status`,
      { action, reason, ...resolution },
    );
    return data.data;
  },
};
