import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tutorService } from "../service/tutorService";
import { useCurrentUser } from "./useAuth";

const MY_APPLICATION_KEY = ["tutor", "me", "application"] as const;
const MY_BOOKINGS_TUTOR_KEY = ["tutor", "me", "bookings", "asTutor"] as const;
const MY_BOOKINGS_STUDENT_KEY = ["tutor", "me", "bookings", "asStudent"] as const;
const MY_STUDENTS_KEY = ["tutor", "me", "students"] as const;

export function useMyTutorStatus() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: MY_APPLICATION_KEY,
    queryFn: tutorService.getMyApplication,
    enabled: Boolean(currentUser),
  });
}

export function useTutorProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["tutor", "profile", userId],
    queryFn: () => tutorService.getTutorProfile(userId!),
    enabled: Boolean(userId),
    retry: false,
  });
}

const bookingKey = (bookingId: string | undefined) => ["tutor", "booking", bookingId] as const;

/** Live status for one booking — used by the Messages booking-request
 * card so it reflects accept/decline immediately, not just the snapshot
 * captured in the message's own metadata at request time. */
export function useBookingById(bookingId: string | undefined) {
  return useQuery({
    queryKey: bookingKey(bookingId),
    queryFn: () => tutorService.getBookingById(bookingId!),
    enabled: Boolean(bookingId),
  });
}

export function useApplyAsTutor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tutorService.apply,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_APPLICATION_KEY }),
  });
}

export function useUpdateTutorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tutorService.updateMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_APPLICATION_KEY }),
  });
}

export function useMyBookingsAsTutor() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: MY_BOOKINGS_TUTOR_KEY,
    queryFn: tutorService.listMyBookingsAsTutor,
    enabled: Boolean(currentUser),
    refetchInterval: 45000,
  });
}

export function useMyBookingsAsStudent() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: MY_BOOKINGS_STUDENT_KEY,
    queryFn: tutorService.listMyBookingsAsStudent,
    enabled: Boolean(currentUser),
    refetchInterval: 45000,
  });
}

export function useMyStudents() {
  const currentUser = useCurrentUser();
  return useQuery({
    queryKey: MY_STUDENTS_KEY,
    queryFn: tutorService.listMyStudents,
    enabled: Boolean(currentUser),
  });
}

export function useRequestBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tutorUserId,
      data,
    }: {
      tutorUserId: string;
      data: { subjectId: string; requestedStartAt: string; durationMinutes: number; message?: string };
    }) => tutorService.requestBooking(tutorUserId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_STUDENT_KEY });
      // The request also lands as a message in the tutor<->student thread.
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useDecideBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: "accepted" | "declined" }) =>
      tutorService.decideBooking(bookingId, status),
    onSuccess: (data, { bookingId }) => {
      // Seed the single-booking cache directly from the response instead
      // of only invalidating it — the Messages booking-request card reads
      // this query, and waiting on an async refetch left it showing the
      // stale "pending" state (with Accept/Decline still visible) for a
      // moment after the click within the same session.
      queryClient.setQueryData(bookingKey(bookingId), data);
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_TUTOR_KEY });
      queryClient.invalidateQueries({ queryKey: MY_STUDENTS_KEY });
      queryClient.invalidateQueries({ queryKey: bookingKey(bookingId) });
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: { requestedStartAt: string; durationMinutes?: number };
    }) => tutorService.rescheduleBooking(bookingId, data),
    onSuccess: (data, { bookingId }) => {
      queryClient.setQueryData(bookingKey(bookingId), data);
      queryClient.invalidateQueries({ queryKey: bookingKey(bookingId) });
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_TUTOR_KEY });
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_STUDENT_KEY });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useGoogleCalendarAuthUrl() {
  return useMutation({ mutationFn: tutorService.getGoogleCalendarAuthUrl });
}

export function useDisconnectGoogleCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tutorService.disconnectGoogleCalendar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_APPLICATION_KEY }),
  });
}

// ---- Admin ----
export function useAdminTutorApplications(status: "pending" | "approved" | "rejected") {
  return useQuery({
    queryKey: ["admin", "tutorApplications", status],
    queryFn: () => tutorService.adminListApplications(status),
  });
}

export function useAdminDecideTutorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "approve" | "reject"; reason?: string }) =>
      tutorService.adminDecideApplication(id, action, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "tutorApplications"] }),
  });
}

export function useAdminTutorApplication(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "tutorApplication", id],
    queryFn: () => tutorService.adminGetApplication(id!),
    enabled: Boolean(id),
  });
}

export function useAdminDeleteTutorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tutorService.adminDeleteApplication(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "tutorApplications"] }),
  });
}

export function useAdminGrantTutorTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { bio: string; subjects: string[]; experience: string; hourlyRate?: number };
    }) => tutorService.adminGrantTutorTag(userId, data),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tutorApplications"] });
      queryClient.invalidateQueries({ queryKey: ["tutor", "profile", userId] });
    },
  });
}

export function useAdminUpdateTutorTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { bio?: string; subjects?: string[]; hourlyRate?: number | null; isActive?: boolean };
    }) => tutorService.adminUpdateTutorTag(userId, data),
    onSuccess: (_data, { userId }) => queryClient.invalidateQueries({ queryKey: ["tutor", "profile", userId] }),
  });
}

export function useAdminRevokeTutorTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tutorService.adminRevokeTutorTag(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tutorApplications"] });
      queryClient.invalidateQueries({ queryKey: ["tutor", "profile", userId] });
    },
  });
}
