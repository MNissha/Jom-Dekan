export interface Profile {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  termsAcceptedAt: string | null;
  displayName: string;
  photoPath: string | null;
  phone: string | null;
  academicRole: 'STUDENT' | 'TUTOR';
  university: { id: string; name: string | null } | null;
  fieldOfStudy: string | null;
  studyLevel: string | null;
  currentYear: number | null;
  currentSemester: number | null;
  createdAt: string;
}

export interface ProfileStats {
  resourceCount: number;
  forumPostCount: number;
  forumCommentCount: number;
  tutorListingCount: number;
  freelanceListingCount: number;
  favoriteCount: number;
}

export type ActivityType =
  | 'RESOURCE_UPLOADED'
  | 'FORUM_POST_CREATED'
  | 'FORUM_COMMENT_CREATED'
  | 'RESOURCE_FAVORITED';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  targetId: string;
  createdAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  phone?: string;
  email?: string;
  academicRole?: 'STUDENT' | 'TUTOR';
  universityId?: string;
  fieldOfStudy?: string;
  currentYear?: number;
  currentSemester?: number;
}
