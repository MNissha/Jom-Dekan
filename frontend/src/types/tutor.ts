export type TutorApplicationStatus = "pending" | "approved" | "rejected";
export type TutorBookingStatus = "pending" | "accepted" | "declined";

export interface TutorApplication {
  id: string;
  userId: string;
  bio: string;
  subjects: string[];
  experience: string;
  hourlyRate: number | null;
  status: TutorApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  applicantEmail?: string;
  applicantName?: string | null;
  applicantPhone?: string | null;
}

export interface TutorProfile {
  userId: string;
  bio: string;
  subjects: string[];
  hourlyRate: number | null;
  experience: string | null;
  isActive: boolean;
  verifiedAt: string;
  googleCalendarConnected: boolean;
  googleCalendarEmail: string | null;
}

export interface MyTutorStatus {
  application: TutorApplication | null;
  isVerifiedTutor: boolean;
  profile: TutorProfile | null;
}

export interface TutorBooking {
  id: string;
  tutorId: string;
  tutorName: string | null;
  tutorEmail: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  studentPhone: string | null;
  subjectId: string | null;
  subjectName: string | null;
  requestedStartAt: string;
  durationMinutes: number;
  message: string | null;
  status: TutorBookingStatus;
  googleCalendarEventId: string | null;
  createdAt: string;
}

export interface TutorStudent {
  studentId: string;
  studentName: string | null;
  studentEmail: string;
  sessionCount: number;
  lastSessionAt: string;
}
