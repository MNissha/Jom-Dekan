import axiosInstance from "../api/axiosInstance";
import type { Report, ReportCategory, ReportTargetType } from "../types/report";

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  parentId?: string;
  category: ReportCategory;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  description: string;
  screenshot?: File | null;
}

export const reportService = {
  create: async (data: CreateReportInput): Promise<Report> => {
    const formData = new FormData();
    formData.append("targetType", data.targetType);
    formData.append("targetId", data.targetId);
    if (data.parentId) formData.append("parentId", data.parentId);
    formData.append("category", data.category);
    formData.append("reporterName", data.reporterName);
    formData.append("reporterPhone", data.reporterPhone);
    formData.append("reporterEmail", data.reporterEmail);
    formData.append("description", data.description);
    if (data.screenshot) formData.append("screenshot", data.screenshot);
    const res = await axiosInstance.post<{ data: Report }>("/reports", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
};
