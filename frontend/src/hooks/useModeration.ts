import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { moderationService } from "../service/moderationService";
import { useCurrentUser } from "./useAuth";
import type { ReportResolutionPayload } from "../types/moderation";

export function useModeration() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: moderationService.getNotifications,
  });

  const queueQuery = useQuery({
    queryKey: ["moderationQueue"],
    queryFn: moderationService.getModerationQueue,
    enabled: user?.role === "ADMIN",
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => moderationService.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const announcementMutation = useMutation({
    mutationFn: moderationService.sendAnnouncement,
  });

  const moderationActionMutation = useMutation({
    mutationFn: ({
      targetType,
      id,
      action,
      reason,
      resolution,
    }: {
      targetType: string;
      id: string;
      action: string;
      reason: string;
      resolution?: ReportResolutionPayload;
    }) =>
      moderationService.handleModerationAction(
        targetType,
        id,
        action,
        reason,
        resolution,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationQueue"] });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    isLoadingNotifications: notificationsQuery.isLoading,
    queue: queueQuery.data || [],
    isLoadingQueue: queueQuery.isLoading,
    markAsRead: markReadMutation.mutateAsync,
    sendAnnouncement: announcementMutation.mutateAsync,
    isSendingAnnouncement: announcementMutation.isPending,
    handleAction: moderationActionMutation.mutateAsync,
  };
}
