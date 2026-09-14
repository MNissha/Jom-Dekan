import axiosInstance from "../api/axiosInstance";
import type { SubmitSupportRequestPayload } from "../types/supportRequest";

export const supportRequestService = {
  async submit(payload: SubmitSupportRequestPayload) {
    const { data } = await axiosInstance.post("/support-requests", payload);
    return data.data;
  },
};
