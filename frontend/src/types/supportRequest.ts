export type SupportRequestType = "SUPPORT" | "SUGGESTION";

export interface SubmitSupportRequestPayload {
  type: SupportRequestType;
  subject?: string;
  message: string;
}
