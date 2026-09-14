export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  status: string;
  suspendedUntil: string | null;
  createdAt: string;
  postCount: number;
  commentCount: number;
  likesReceived: number;
}

export interface AdminUserProfile {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  status: string;
  suspendedUntil: string | null;
  createdAt: string;
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  displayName: string;
  role: "USER" | "ADMIN";
}

export interface UpdateAdminUserInput {
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
}

export interface AdminUserResource {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface AdminUserForumActivity {
  type: "post" | "comment";
  id: string;
  postId: string;
  title: string | null;
  body: string;
  createdAt: string;
}

export interface AdminUserApplication {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  status: string;
  createdAt: string;
}

export interface AdminUserOpportunity {
  id: string;
  title: string;
  listingType: "TUTORING" | "PROJECT_MENTORSHIP";
  status: string;
  createdAt: string;
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
}
