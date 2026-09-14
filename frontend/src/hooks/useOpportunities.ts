import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opportunityService, type ApplyToOpportunityInput } from "../service/opportunityService";
import type { OpportunityApplicationStatus } from "../types/opportunity";
import { useToast } from "../context/ToastContext";

export function useOpportunities() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const opportunitiesQuery = useQuery({
    queryKey: ["opportunities"],
    queryFn: opportunityService.getOpportunities,
  });

  const createMutation = useMutation({
    mutationFn: opportunityService.createOpportunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: ({
      opportunityId,
      coverMessage,
      cvFile,
      cvUrl,
      portfolioFile,
      portfolioUrl,
    }: { opportunityId: string } & ApplyToOpportunityInput) =>
      opportunityService.applyToOpportunity(opportunityId, {
        coverMessage,
        cvFile,
        cvUrl,
        portfolioFile,
        portfolioUrl,
      }),
    onSuccess: () => {
      toast.success("Application submitted successfully!");
    },
  });

  return {
    opportunities: opportunitiesQuery.data || [],
    isLoading: opportunitiesQuery.isLoading,
    error: opportunitiesQuery.error,
    createOpportunity: createMutation.mutateAsync,
    applyToOpportunity: applyMutation.mutateAsync,
  };
}

export function useMyOpportunities() {
  const query = useQuery({
    queryKey: ["opportunities", "mine"],
    queryFn: opportunityService.getMyOpportunities,
  });
  return { myOpportunities: query.data || [], isLoading: query.isLoading, error: query.error };
}

export function useOpportunityApplications(opportunityId: string | null) {
  const query = useQuery({
    queryKey: ["opportunities", opportunityId, "applications"],
    queryFn: () => opportunityService.getApplications(opportunityId!),
    enabled: Boolean(opportunityId),
  });
  return { applications: query.data || [], isLoading: query.isLoading, error: query.error };
}

export function useDecideApplication(opportunityId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({
      applicationId,
      status,
    }: {
      applicationId: string;
      status: Extract<OpportunityApplicationStatus, "accepted" | "declined">;
    }) => opportunityService.decideApplication(applicationId, status),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", opportunityId, "applications"] });
      toast.success(status === "accepted" ? "Application accepted." : "Application declined.");
    },
  });
}
