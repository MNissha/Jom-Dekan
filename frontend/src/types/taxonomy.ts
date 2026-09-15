export interface University {
  id: string;
  name: string;
  slug: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Faculty {
  id: string;
  universityId: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Programme {
  id: string;
  facultyId: string;
  name: string;
  slug: string;
  studyLevel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// A student-submitted "my university/faculty/programme isn't listed"
// report — no self-service creation for these (unlike Subject), so this
// just records the gap for an admin to review later.
export interface TaxonomyRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  universityId: string | null;
  requestedUniversityName: string | null;
  facultyId: string | null;
  requestedFacultyName: string | null;
  programmeId: string | null;
  requestedProgrammeName: string | null;
  requestedSubjectCode: string | null;
  requestedSubjectName: string | null;
  note: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  // "COMMUNITY" subjects were added inline by a student during upload
  // rather than by an admin — see UploadResource's "add a new subject"
  // flow. verificationStatus is what an admin flips once they've
  // reviewed it.
  source: "ADMIN" | "COMMUNITY";
  verificationStatus: "COMMUNITY_SUBMITTED" | "ADMIN_VERIFIED";
  createdAt: string;
  updatedAt: string;
}
