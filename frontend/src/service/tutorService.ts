import axiosInstance from "../api/axiosInstance";
import type { MyTutorStatus, TutorApplication, TutorBooking, TutorProfile, TutorStudent } from "../types/tutor";

export const tutorService = {
  async apply(data: { bio: string; subjects: string[]; experience: string; hourlyRate?: number }) {
    const { data: res } = await axiosInstance.post("/tutors/apply", data);
    return res.data as TutorApplication;
  },
  async getMyApplication() {
    const { data } = await axiosInstance.get("/tutors/me/application");
    return data.data as MyTutorStatus;
  },
  async getTutorProfile(userId: string) {
    const { data } = await axiosInstance.get(`/tutors/${userId}`);
    return data.data as TutorProfile;
  },
  async updateMyProfile(data: { bio?: string; subjects?: string[]; hourlyRate?: number | null; isActive?: boolean }) {
    const { data: res } = await axiosInstance.patch("/tutors/me", data);
    return res.data as TutorProfile;
  },
  async requestBooking(
    tutorUserId: string,
    data: { subjectId: string; requestedStartAt: string; durationMinutes: number; message?: string },
  ) {
    const { data: res } = await axiosInstance.post(`/tutors/${tutorUserId}/bookings`, data);
    return res.data as TutorBooking;
  },
  async getBookingById(bookingId: string) {
    const { data } = await axiosInstance.get(`/tutors/bookings/${bookingId}`);
    return data.data as TutorBooking;
  },
  async listMyBookingsAsTutor() {
    const { data } = await axiosInstance.get("/tutors/me/bookings");
    return data.data as TutorBooking[];
  },
  async listMyBookingsAsStudent() {
    const { data } = await axiosInstance.get("/tutors/me/bookings/as-student");
    return data.data as TutorBooking[];
  },
  async listMyStudents() {
    const { data } = await axiosInstance.get("/tutors/me/students");
    return data.data as TutorStudent[];
  },
  async decideBooking(bookingId: string, status: "accepted" | "declined") {
    const { data } = await axiosInstance.patch(`/tutors/bookings/${bookingId}/status`, { status });
    return data.data as TutorBooking;
  },
  async rescheduleBooking(bookingId: string, data: { requestedStartAt: string; durationMinutes?: number }) {
    const { data: res } = await axiosInstance.patch(`/tutors/bookings/${bookingId}/reschedule`, data);
    return res.data as TutorBooking;
  },
  async getGoogleCalendarAuthUrl() {
    const { data } = await axiosInstance.get("/tutors/me/google-calendar/auth-url");
    return data.data as { url: string };
  },
  async disconnectGoogleCalendar() {
    await axiosInstance.delete("/tutors/me/google-calendar");
  },

  // ---- Admin ----
  async adminListApplications(status: "pending" | "approved" | "rejected") {
    const { data } = await axiosInstance.get("/admin/tutor-applications", { params: { status } });
    return data.data as TutorApplication[];
  },
  async adminDecideApplication(id: string, action: "approve" | "reject", reason?: string) {
    const { data } = await axiosInstance.patch(`/admin/tutor-applications/${id}`, { action, reason });
    return data.data as TutorApplication;
  },
  async adminGetApplication(id: string) {
    const { data } = await axiosInstance.get(`/admin/tutor-applications/${id}`);
    return data.data as TutorApplication;
  },
  async adminDeleteApplication(id: string) {
    await axiosInstance.delete(`/admin/tutor-applications/${id}`);
  },
  async adminGrantTutorTag(
    userId: string,
    data: { bio: string; subjects: string[]; experience: string; hourlyRate?: number },
  ) {
    const { data: res } = await axiosInstance.post(`/admin/tutors/${userId}`, data);
    return res.data as TutorProfile;
  },
  async adminUpdateTutorTag(
    userId: string,
    data: { bio?: string; subjects?: string[]; hourlyRate?: number | null; isActive?: boolean },
  ) {
    const { data: res } = await axiosInstance.patch(`/admin/tutors/${userId}`, data);
    return res.data as TutorProfile;
  },
  async adminRevokeTutorTag(userId: string) {
    await axiosInstance.delete(`/admin/tutors/${userId}`);
  },
};
