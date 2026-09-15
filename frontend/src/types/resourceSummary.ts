export type ResourceSummarySourceType = "TEXT_RESOURCE" | "EXTRACTED_DOCUMENT" | "IMAGE";

export type ResourceSummaryStatus =
  | "DISABLED"
  | "NOT_GENERATED"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "UNSUPPORTED";

export interface ResourceSummaryStudySection {
  heading: string;
  content: string;
}

export interface ResourceSummaryGlossaryEntry {
  term: string;
  definition: string;
}

export interface ResourceSummaryContent {
  overview: string;
  keyPoints: string[];
  studySections: ResourceSummaryStudySection[];
  topics: string[];
  glossary: ResourceSummaryGlossaryEntry[];
  limitations: string[];
  language: string;
}

export interface AiSourceDescriptor {
  resourceFileId: string;
  filename: string;
  fileType: string;
  supported: boolean;
  recommended: boolean;
}

export interface ResourceSummaryView {
  status: ResourceSummaryStatus;
  sourceType: ResourceSummarySourceType;
  summary: ResourceSummaryContent | null;
  model: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  generatedAt: string | null;
  updatedAt: string | null;
  // Absent from an older cached response — treat as "no selection info
  // available yet" rather than assuming a single-file resource.
  selectedSource?: Omit<AiSourceDescriptor, "recommended"> | null;
  availableSources?: AiSourceDescriptor[];
}

export const AI_SUMMARY_DISCLAIMER =
  "AI-generated study aid. This summary may contain mistakes or omit important context. Verify important information using the original resource.";
