import axiosInstance from "../api/axiosInstance";

export const opportunityService = {
  async getOpportunities() {
    const { data } = await axiosInstance.get("/opportunities");
    return data.data;
  },
  async createOpportunity(payload: {
    title: string;
    description: string;
    subjectId?: string;
    listingType: string;
    mode: string;
  }) {
    const { data } = await axiosInstance.post("/opportunities", payload);
    return data.data;
  },
  async applyToOpportunity(opportunityId: string, coverMessage: string) {
    const { data } = await axiosInstance.post(
      `/opportunities/${opportunityId}/applications`,
      { coverMessage },
    );
    return data.data;
  },
  async getAllOpportunitiesAdmin() {
    const { data } = await axiosInstance.get("/opportunities/admin/all");
    return data.data;
  },
  async updateOpportunityStatus(id: string, status: "active" | "closed") {
    const { data } = await axiosInstance.patch(`/opportunities/${id}/status`, {
      status,
    });
    return data.data;
  },
  async adminCreateOpportunity(payload: { title: string; description: string; mode: string; listingType: string }) {
    const { data } = await axiosInstance.post("/opportunities/admin", payload);
    return data.data;
  },
  async adminUpdateOpportunity(id: string, payload: { title: string; description: string; mode: string }) {
    const { data } = await axiosInstance.patch(`/opportunities/admin/${id}`, payload);
    return data.data;
  },
  async adminDeleteOpportunity(id: string) {
    await axiosInstance.delete(`/opportunities/admin/${id}`);
  },
};
