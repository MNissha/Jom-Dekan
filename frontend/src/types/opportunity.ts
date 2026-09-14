export type OpportunityListingType = "TUTORING" | "STUDY_GROUP" | "PROJECT_MENTORSHIP";
export type OpportunityMode = "ONLINE" | "PHYSICAL" | "HYBRID";
export type OpportunityStatus = "active" | "closed";
export type OpportunityApplicationStatus = "pending" | "accepted" | "declined";

export interface Opportunity {
  id: string;
  owner_id: string;
  owner_name: string | null;
  subject_id: string | null;
  subject_code: string | null;
  subject_name: string | null;
  title: string;
  description: string;
  listing_type: OpportunityListingType;
  mode: OpportunityMode;
  status: OpportunityStatus;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
  my_application_status: OpportunityApplicationStatus | null;
}

export interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  applicant_name: string | null;
  applicant_email: string;
  cover_message: string;
  status: OpportunityApplicationStatus;
  has_cv: boolean;
  cv_url: string | null;
  has_portfolio: boolean;
  portfolio_url: string | null;
  created_at: string;
}
