import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opportunityService } from "../service/opportunityService";
import type { OpportunityStatus } from "../types/opportunity";

export function useAdminOpportunities() {
  const queryClient = useQueryClient();

  const opportunitiesQuery = useQuery({
    queryKey: ["adminOpportunities"],
    queryFn: opportunityService.getAllOpportunitiesAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OpportunityStatus }) =>
      opportunityService.updateOpportunityStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOpportunities"] });
    },
  });

  const createMutation = useMutation({ mutationFn: opportunityService.adminCreateOpportunity, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminOpportunities"] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: { title: string; description: string; mode: string } }) => opportunityService.adminUpdateOpportunity(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminOpportunities"] }) });
  const deleteMutation = useMutation({ mutationFn: opportunityService.adminDeleteOpportunity, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminOpportunities"] }) });

  return {
    opportunities: opportunitiesQuery.data || [],
    isLoading: opportunitiesQuery.isLoading,
    updateStatus: updateStatusMutation.mutateAsync,
    createOpportunity: createMutation,
    updateOpportunity: updateMutation,
    deleteOpportunity: deleteMutation,
    isError: opportunitiesQuery.isError,
  };
}
