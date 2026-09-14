import axiosInstance from "../api/axiosInstance";
import type { OpportunityApplication, OpportunityApplicationStatus } from "../types/opportunity";

export interface ApplyToOpportunityInput {
  coverMessage: string;
  cvFile?: File;
  cvUrl?: string;
  portfolioFile?: File;
  portfolioUrl?: string;
}

export const opportunityService = {
  async getOpportunities() {
    const { data } = await axiosInstance.get("/opportunities");
    return data.data;
  },
  async getMyOpportunities() {
    const { data } = await axiosInstance.get("/opportunities/mine");
    return data.data;
  },
  async createOpportunity(payload: {
    title: string;
    description: string;
    subjectId?: string;
    listingType: string;
    mode: string;
    applicationDeadline?: string;
  }) {
    const { data } = await axiosInstance.post("/opportunities", payload);
    return data.data;
  },
  async applyToOpportunity(opportunityId: string, input: ApplyToOpportunityInput) {
    const formData = new FormData();
    formData.append("coverMessage", input.coverMessage);
    if (input.cvUrl) formData.append("cvUrl", input.cvUrl);
    if (input.portfolioUrl) formData.append("portfolioUrl", input.portfolioUrl);
    if (input.cvFile) formData.append("cv", input.cvFile);
    if (input.portfolioFile) formData.append("portfolio", input.portfolioFile);
    const { data } = await axiosInstance.post(
      `/opportunities/${opportunityId}/applications`,
      formData,
      { headers: { "Content-Type": undefined } },
    );
    return data.data;
  },
  async getApplications(opportunityId: string): Promise<OpportunityApplication[]> {
    const { data } = await axiosInstance.get(`/opportunities/${opportunityId}/applications`);
    return data.data;
  },
  async decideApplication(applicationId: string, status: Extract<OpportunityApplicationStatus, "accepted" | "declined">) {
    const { data } = await axiosInstance.patch(`/opportunities/applications/${applicationId}/status`, { status });
    return data.data;
  },
  async downloadApplicationFile(applicationId: string, kind: "cv" | "portfolio", suggestedFilename: string) {
    const response = await axiosInstance.get(
      `/opportunities/applications/${applicationId}/files/${kind}`,
      { responseType: "blob" },
    );
    const url = window.URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggestedFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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
