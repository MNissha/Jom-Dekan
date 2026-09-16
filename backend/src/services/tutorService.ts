import { randomUUID } from "crypto";
import {
  tutorModel,
  type TutorApplicationRow,
  type TutorApplicationWithApplicant,
  type TutorBookingStatus,
  type TutorBookingWithContext,
  type TutorProfileRow,
} from "../models/tutorModel";
import { userModel } from "../models/userModel";
import { notificationModel } from "../models/notificationModel";
import { auditLogModel } from "../models/auditLogModel";
import { messageModel } from "../models/messageModel";
import { emailService } from "../services/emailService";
import { googleCalendarService } from "../services/googleCalendarService";
import { encryptSecret, decryptSecret } from "../utils/crypto";
import { logger } from "../utils/logger";
import { env } from "../config/config/env";
import { AppError } from "../types/errors";
import { getStorageAdapter, signUploadToken } from "../config/config/storage";
import { detectFileType } from "../utils/fileSniffer";

// Resumes are a document, not one of resources' image/office types —
// scoped to just PDF/DOCX regardless of what resources otherwise allow.
const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const RESUME_UPLOAD_TOKEN_TTL_SECONDS = 300;
const RESUME_DOWNLOAD_TOKEN_TTL_SECONDS = 300;

function profileUrl(): string {
  return `${env.corsOrigins[0]}/profile?section=tutor`;
}

function bookingsUrl(): string {
  return `${env.corsOrigins[0]}/profile?section=bookings`;
}

function toApiApplication(row: TutorApplicationRow | TutorApplicationWithApplicant) {
  const withApplicant = row as TutorApplicationWithApplicant;
  return {
    id: row.id,
    userId: row.user_id,
    bio: row.bio,
    subjects: row.subjects,
    experience: row.experience,
    hourlyRate: row.hourly_rate ? Number(row.hourly_rate) : null,
    openToOtherUniversities: row.open_to_other_universities,
    resumeFilename: row.resume_original_filename,
    portfolioUrl: row.portfolio_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    ...(withApplicant.applicant_email
      ? {
          applicantEmail: withApplicant.applicant_email,
          applicantName: withApplicant.applicant_name,
          applicantPhone: withApplicant.applicant_phone,
        }
      : {}),
  };
}

function toApiProfile(row: TutorProfileRow) {
  return {
    userId: row.user_id,
    bio: row.bio,
    subjects: row.subjects,
    hourlyRate: row.hourly_rate ? Number(row.hourly_rate) : null,
    experience: row.experience,
    openToOtherUniversities: row.open_to_other_universities,
    resumeFilename: row.resume_original_filename,
    portfolioUrl: row.portfolio_url,
    isActive: row.is_active,
    verifiedAt: row.verified_at,
    googleCalendarConnected: row.google_calendar_connected,
    googleCalendarEmail: row.google_calendar_email,
  };
}

function toApiBooking(row: TutorBookingWithContext) {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    tutorName: row.tutor_name,
    tutorEmail: row.tutor_email,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    studentPhone: row.student_phone,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    requestedStartAt: row.requested_start_at,
    durationMinutes: row.duration_minutes,
    message: row.message,
    status: row.status,
    rescheduleProposedBy: row.reschedule_proposed_by,
    googleCalendarEventId: row.google_calendar_event_id,
    createdAt: row.created_at,
  };
}

export const tutorService = {
  /**
   * Signs an upload token for a tutor's resume, same mechanism as
   * resources' own uploads (a short-lived JWT carrying just the storage
   * key), but pointed at this service's own upload route instead —
   * unlike resources, a resume has no resource_files row to claim, so
   * it can't go through resourceService's own upload-intent/receive
   * pair as-is.
   */
  async getResumeUploadIntent(input: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }) {
    if (!(ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(input.contentType)) {
      throw AppError.badRequest("Resume must be a PDF or Word document.");
    }
    if (input.sizeBytes > MAX_RESUME_SIZE_BYTES) {
      throw AppError.badRequest(
        `Resume is too large. Maximum size is ${Math.floor(MAX_RESUME_SIZE_BYTES / (1024 * 1024))}MB.`,
      );
    }
    const safeName = input.fileName.replace(/[^\w.\-]+/g, "_").slice(-100);
    const key = `tutor-resumes/${randomUUID()}-${safeName}`;
    const token = signUploadToken(key, RESUME_UPLOAD_TOKEN_TTL_SECONDS);
    return { uploadUrl: `/api/v1/tutors/resume-upload?token=${token}`, key };
  },

  /** Receives the resume's bytes for a pending upload token. */
  async receiveResumeUpload(storageKey: string, buffer: Buffer) {
    const detected = detectFileType(buffer);
    if (!detected || !(ALLOWED_RESUME_MIME_TYPES as readonly string[]).includes(detected)) {
      throw AppError.badRequest("The uploaded file must be a real PDF or Word document.");
    }
    await getStorageAdapter().putObject(storageKey, buffer, detected);
    return { key: storageKey, mimeType: detected };
  },

  async getApplicationResumeUrl(applicationId: string, ctx: { actorUserId: string; actorRole: "USER" | "ADMIN" }) {
    const application = await tutorModel.applications.findById(applicationId);
    if (!application) throw AppError.notFound("Application not found.");
    if (application.user_id !== ctx.actorUserId && ctx.actorRole !== "ADMIN") {
      throw AppError.forbidden();
    }
    if (!application.resume_storage_key) throw AppError.notFound("No resume on file for this application.");
    const url = await getStorageAdapter().createSignedDownloadUrl(
      application.resume_storage_key,
      RESUME_DOWNLOAD_TOKEN_TTL_SECONDS,
    );
    return { url, filename: application.resume_original_filename };
  },

  async getProfileResumeUrl(userId: string, ctx: { actorUserId: string; actorRole: "USER" | "ADMIN" }) {
    const profile = await tutorModel.profiles.findByUserId(userId);
    if (!profile) throw AppError.notFound("This user is not a verified tutor.");
    if (userId !== ctx.actorUserId && ctx.actorRole !== "ADMIN") {
      throw AppError.forbidden();
    }
    if (!profile.resume_storage_key) throw AppError.notFound("No resume on file for this tutor.");
    const url = await getStorageAdapter().createSignedDownloadUrl(
      profile.resume_storage_key,
      RESUME_DOWNLOAD_TOKEN_TTL_SECONDS,
    );
    return { url, filename: profile.resume_original_filename };
  },

  // ---- Applications ----------------------------------------------------
  async applyAsTutor(
    userId: string,
    data: {
      bio: string;
      subjects: string[];
      experience: string;
      hourlyRate?: number;
      openToOtherUniversities?: boolean;
      resumeStorageKey: string;
      resumeOriginalFilename: string;
      resumeMimeType: string;
      resumeSizeBytes: number;
      portfolioUrl?: string;
    },
  ) {
    const application = await tutorModel.applications.create(userId, data);

    const applicant = await userModel.findById(userId);
    await notificationModel.notifyAdmins("TUTOR_APPLICATION_SUBMITTED", {
      title: "New tutor application",
      message: `${applicant?.email ?? "A user"} applied to become a verified tutor.`,
      applicationId: application.id,
      userId,
    });

    return toApiApplication(application);
  },

  async getMyApplicationStatus(userId: string) {
    const [application, profile] = await Promise.all([
      tutorModel.applications.findLatestForUser(userId),
      tutorModel.profiles.findByUserId(userId),
    ]);
    return {
      application: application ? toApiApplication(application) : null,
      isVerifiedTutor: Boolean(profile),
      profile: profile ? toApiProfile(profile) : null,
    };
  },

  async isVerifiedTutor(userId: string): Promise<boolean> {
    return await tutorModel.profiles.isVerified(userId);
  },

  async getTutorProfile(userId: string) {
    const profile = await tutorModel.profiles.findByUserId(userId);
    if (!profile) throw AppError.notFound("This user is not a verified tutor.");
    return toApiProfile(profile);
  },

  async updateTutorProfile(
    userId: string,
    data: {
      bio?: string;
      subjects?: string[];
      hourlyRate?: number | null;
      isActive?: boolean;
      openToOtherUniversities?: boolean;
      resumeStorageKey?: string;
      resumeOriginalFilename?: string;
      resumeMimeType?: string;
      resumeSizeBytes?: number;
      portfolioUrl?: string | null;
    },
  ) {
    const profile = await tutorModel.profiles.findByUserId(userId);
    if (!profile) throw AppError.forbidden("You are not a verified tutor.");
    const updated = await tutorModel.profiles.update(userId, data);
    return updated ? toApiProfile(updated) : null;
  },

  // ---- Admin review -------------------------------------------------------
  async listApplications(status: "pending" | "approved" | "rejected") {
    const rows = await tutorModel.applications.listByStatus(status);
    return rows.map(toApiApplication);
  },

  async getApplicationById(id: string) {
    const application = await tutorModel.applications.findByIdWithApplicant(id);
    if (!application) throw AppError.notFound("Application not found.");
    return toApiApplication(application);
  },

  async deleteApplication(adminId: string, id: string) {
    const application = await tutorModel.applications.findById(id);
    if (!application) throw AppError.notFound("Application not found.");

    // This application may be the one that granted the user's tutor
    // tag (tutor_profiles.source_application_id) — the DB cascades that
    // delete automatically (migration 039), but check first so we can
    // tell the user their tag was revoked, not just their old application.
    const linkedProfile = await tutorModel.profiles.findBySourceApplicationId(id);

    await tutorModel.applications.remove(id);

    await auditLogModel.record({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "TUTOR_APPLICATION_DELETED",
      targetType: "tutor_application",
      targetId: id,
      metadata: { userId: application.user_id, status: application.status, revokedTag: Boolean(linkedProfile) },
    });

    if (linkedProfile) {
      await notificationModel.notifyUser(application.user_id, "TUTOR_TAG_REVOKED", {
        title: "Your tutor status was revoked",
        message: "The application behind your verified tutor tag was removed by an admin, so you're no longer a verified tutor.",
      });

      const user = await userModel.findById(application.user_id);
      if (user) {
        emailService
          .sendEmail({
            to: user.email,
            subject: "Your JomDekan tutor status has been revoked",
            text: [
              "The application behind your verified tutor tag was removed by an admin, so you're no longer a verified tutor.",
              "You can submit a new application any time from your profile.",
              `Manage your tutor profile: ${profileUrl()}`,
            ].join("\n"),
          })
          .catch((err) => logger.error({ err, applicationId: id }, "Failed to email user about revoked tutor tag"));
      }
    }
  },

  async decideApplication(
    adminId: string,
    applicationId: string,
    decision: "approved" | "rejected",
    reason?: string,
  ) {
    const application = await tutorModel.applications.findById(applicationId);
    if (!application) throw AppError.notFound("Application not found.");
    if (application.status !== "pending") {
      throw AppError.badRequest("This application has already been decided.");
    }
    if (decision === "rejected" && !reason) {
      throw AppError.badRequest("A reason is required when rejecting an application.");
    }

    const updated = await tutorModel.applications.decide(applicationId, decision, adminId, reason ?? null);

    if (decision === "approved") {
      await tutorModel.profiles.upsertFromApplication(application.user_id, {
        bio: application.bio,
        subjects: application.subjects,
        experience: application.experience,
        hourlyRate: application.hourly_rate ? Number(application.hourly_rate) : null,
        openToOtherUniversities: application.open_to_other_universities,
        resumeStorageKey: application.resume_storage_key,
        resumeOriginalFilename: application.resume_original_filename,
        resumeMimeType: application.resume_mime_type,
        resumeSizeBytes: application.resume_size_bytes,
        portfolioUrl: application.portfolio_url,
        sourceApplicationId: application.id,
      });
    }

    await auditLogModel.record({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: decision === "approved" ? "TUTOR_APPLICATION_APPROVED" : "TUTOR_APPLICATION_REJECTED",
      targetType: "tutor_application",
      targetId: applicationId,
      reason,
      metadata: { userId: application.user_id },
    });

    await notificationModel.notifyUser(
      application.user_id,
      decision === "approved" ? "TUTOR_APPLICATION_APPROVED" : "TUTOR_APPLICATION_REJECTED",
      {
        title: decision === "approved" ? "You're a verified tutor!" : "Your tutor application was declined",
        message:
          decision === "approved"
            ? "Your application to become a JomDekan tutor was approved. You can now post tutoring listings and receive booking requests."
            : `Your application to become a JomDekan tutor was declined.${reason ? ` Reason: ${reason}` : ""}`,
        applicationId,
      },
    );

    const applicant = await userModel.findById(application.user_id);
    if (applicant) {
      // Not awaited — a real provider's API round-trip (seconds, not
      // milliseconds) must never hold up the HTTP response for an
      // already-completed, already-notified decision.
      emailService
        .sendEmail({
          to: applicant.email,
          subject: decision === "approved" ? "You're now a verified JomDekan tutor" : "Your tutor application was declined",
          text: [
            decision === "approved"
              ? "Congratulations — your application to become a JomDekan tutor was approved."
              : "Your application to become a JomDekan tutor was declined.",
            ...(reason ? [`Reason: ${reason}`] : []),
            "",
            `Manage your tutor profile: ${profileUrl()}`,
          ].join("\n"),
        })
        .catch((err) => logger.error({ err, applicationId }, "Failed to email applicant about tutor application decision"));
    }

    return updated ? toApiApplication(updated) : null;
  },

  // ---- Admin tag management --------------------------------------------
  // The tag (tutor_profiles) is a distinct resource from the application
  // that (usually) grants it — these let an admin manage it directly:
  // grant one with no application behind it, edit an existing tutor's
  // fields, or revoke a tag without touching their application history
  // (deleting the granting application itself is handled by
  // deleteApplication above, via the DB cascade in migration 039).
  async adminGrantTutorTag(
    adminId: string,
    userId: string,
    data: {
      bio: string;
      subjects: string[];
      experience: string;
      hourlyRate?: number;
      openToOtherUniversities?: boolean;
      resumeStorageKey?: string;
      resumeOriginalFilename?: string;
      resumeMimeType?: string;
      resumeSizeBytes?: number;
      portfolioUrl?: string;
    },
  ) {
    const user = await userModel.findById(userId);
    if (!user) throw AppError.notFound("User not found.");
    if (await tutorModel.profiles.isVerified(userId)) {
      throw AppError.badRequest("This user is already a verified tutor.");
    }

    const profile = await tutorModel.profiles.upsertFromApplication(userId, {
      ...data,
      sourceApplicationId: null,
    });

    await auditLogModel.record({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "TUTOR_TAG_GRANTED",
      targetType: "tutor_profile",
      targetId: userId,
    });

    await notificationModel.notifyUser(userId, "TUTOR_APPLICATION_APPROVED", {
      title: "You're a verified tutor!",
      message: "An admin has granted you a verified tutor tag. You can now post tutoring listings and receive booking requests.",
    });

    emailService
      .sendEmail({
        to: user.email,
        subject: "You're now a verified JomDekan tutor",
        text: [
          "An admin has granted you a verified tutor tag on JomDekan.",
          `Manage your tutor profile: ${profileUrl()}`,
        ].join("\n"),
      })
      .catch((err) => logger.error({ err, userId }, "Failed to email user about granted tutor tag"));

    return toApiProfile(profile);
  },

  async adminUpdateTutorTag(
    adminId: string,
    userId: string,
    data: {
      bio?: string;
      subjects?: string[];
      hourlyRate?: number | null;
      isActive?: boolean;
      openToOtherUniversities?: boolean;
      resumeStorageKey?: string;
      resumeOriginalFilename?: string;
      resumeMimeType?: string;
      resumeSizeBytes?: number;
      portfolioUrl?: string;
    },
  ) {
    const profile = await tutorModel.profiles.findByUserId(userId);
    if (!profile) throw AppError.notFound("This user is not a verified tutor.");
    const updated = await tutorModel.profiles.update(userId, data);
    await auditLogModel.record({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "TUTOR_TAG_UPDATED",
      targetType: "tutor_profile",
      targetId: userId,
    });
    return updated ? toApiProfile(updated) : null;
  },

  async adminRevokeTutorTag(adminId: string, userId: string) {
    const profile = await tutorModel.profiles.findByUserId(userId);
    if (!profile) throw AppError.notFound("This user is not a verified tutor.");
    await tutorModel.profiles.remove(userId);

    await auditLogModel.record({
      actorUserId: adminId,
      actorRole: "ADMIN",
      action: "TUTOR_TAG_REVOKED",
      targetType: "tutor_profile",
      targetId: userId,
    });

    await notificationModel.notifyUser(userId, "TUTOR_TAG_REVOKED", {
      title: "Your tutor status was revoked",
      message: "An admin has revoked your verified tutor tag.",
    });

    const user = await userModel.findById(userId);
    if (user) {
      emailService
        .sendEmail({
          to: user.email,
          subject: "Your JomDekan tutor status has been revoked",
          text: [
            "An admin has revoked your verified tutor tag on JomDekan.",
            `Manage your tutor profile: ${profileUrl()}`,
          ].join("\n"),
        })
        .catch((err) => logger.error({ err, userId }, "Failed to email user about revoked tutor tag"));
    }
  },

  // ---- Bookings -------------------------------------------------------
  async requestBooking(
    studentId: string,
    tutorUserId: string,
    data: { subjectId: string; requestedStartAt: Date; durationMinutes: number; message?: string },
  ) {
    if (studentId === tutorUserId) throw AppError.badRequest("You cannot book a session with yourself.");
    const profile = await tutorModel.profiles.findByUserId(tutorUserId);
    if (!profile || !profile.is_active) {
      throw AppError.badRequest("This tutor is not currently accepting bookings.");
    }
    if (!profile.subjects.includes(data.subjectId)) {
      throw AppError.badRequest("This tutor doesn't teach the selected subject.");
    }
    if (data.requestedStartAt.getTime() <= Date.now()) {
      throw AppError.badRequest("The requested session time must be in the future.");
    }

    const booking = await tutorModel.bookings.create(studentId, tutorUserId, data);
    const full = await tutorModel.bookings.findById(booking.id);

    await notificationModel.notifyUser(tutorUserId, "TUTOR_BOOKING_REQUESTED", {
      title: "New booking request",
      message: `${full?.student_name ?? "A student"} requested a session on ${data.requestedStartAt.toLocaleString()}.`,
      bookingId: booking.id,
    });

    // A rich, structured message in the tutor<->student conversation —
    // full contact details + inline Accept/Decline, in addition to the
    // lightweight bell notification above and the best-effort email
    // below. Sent as the student (the party who actually made the
    // request), since messages.sender_id is never nullable.
    try {
      const conversation = await messageModel.conversations.findOrCreate(studentId, tutorUserId);
      await messageModel.messages.create(
        conversation.id,
        studentId,
        `Booking request: ${full?.subject_name ?? "a session"} on ${data.requestedStartAt.toLocaleString()}`,
        {
          messageType: "booking_request",
          metadata: {
            bookingId: booking.id,
            subjectName: full?.subject_name ?? null,
            requestedStartAt: data.requestedStartAt.toISOString(),
            durationMinutes: data.durationMinutes,
            note: data.message ?? null,
            studentName: full?.student_name ?? null,
            studentEmail: full?.student_email ?? null,
            studentPhone: full?.student_phone ?? null,
          },
        },
      );
    } catch (err) {
      // Best-effort, same reasoning as the notification/email below — the
      // booking itself is already recorded even if this fails.
      logger.error({ err, bookingId: booking.id }, "Failed to send booking-request message");
    }

    // Not awaited — see the note on the decision email below.
    emailService
      .sendEmail({
        to: full?.tutor_email ?? "",
        subject: "New tutoring session request",
        text: [
          `${full?.student_name ?? "A student"} (${full?.student_email ?? "unknown"}) requested a tutoring session.`,
          `Subject: ${full?.subject_name ?? "Not specified"}`,
          `Proposed time: ${data.requestedStartAt.toLocaleString()} (${data.durationMinutes} minutes)`,
          ...(full?.student_phone ? [`Contact phone: ${full.student_phone}`] : []),
          ...(data.message ? ["", "Message:", data.message] : []),
          "",
          `Accept or decline this request: ${bookingsUrl()}`,
        ].join("\n"),
      })
      .catch((err) => logger.error({ err, bookingId: booking.id }, "Failed to email tutor about new booking request"));

    return full ? toApiBooking(full) : booking;
  },

  async getBookingById(userId: string, bookingId: string) {
    const booking = await tutorModel.bookings.findById(bookingId);
    if (!booking) throw AppError.notFound("Booking not found.");
    if (booking.tutor_id !== userId && booking.student_id !== userId) throw AppError.forbidden();
    return toApiBooking(booking);
  },

  async listMyBookingsAsTutor(tutorId: string) {
    const rows = await tutorModel.bookings.listForTutor(tutorId);
    return rows.map(toApiBooking);
  },

  async listMyBookingsAsStudent(studentId: string) {
    const rows = await tutorModel.bookings.listForStudent(studentId);
    return rows.map(toApiBooking);
  },

  async listMyStudents(tutorId: string) {
    const rows = await tutorModel.bookings.listStudentsForTutor(tutorId);
    return rows.map((row) => ({
      studentId: row.student_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      sessionCount: row.session_count,
      lastSessionAt: row.last_session_at,
    }));
  },

  async decideBooking(userId: string, bookingId: string, status: TutorBookingStatus) {
    if (status !== "accepted" && status !== "declined") {
      throw AppError.badRequest("Status must be 'accepted' or 'declined'.");
    }
    const booking = await tutorModel.bookings.findById(bookingId);
    if (!booking) throw AppError.notFound("Booking not found.");
    const isParty = booking.tutor_id === userId || booking.student_id === userId;
    if (!isParty) throw AppError.forbidden();
    const expectedDecisionMaker = booking.reschedule_proposed_by
      ? (booking.reschedule_proposed_by === booking.tutor_id ? booking.student_id : booking.tutor_id)
      : booking.tutor_id;
    if (userId !== expectedDecisionMaker) {
      throw AppError.forbidden(
        booking.reschedule_proposed_by
          ? "Only the other party can confirm this reschedule."
          : "Only the tutor can decide an original booking request.",
      );
    }
    if (booking.status !== "pending") throw AppError.badRequest("This booking has already been decided.");

    const isRescheduleDecision = Boolean(booking.reschedule_proposed_by);
    const decisionMakerName = userId === booking.tutor_id
      ? booking.tutor_name ?? "The tutor"
      : booking.student_name ?? "The student";
    const recipientEmail = booking.reschedule_proposed_by === booking.tutor_id
      ? booking.tutor_email
      : booking.student_email;
    const decisionVerb = status === "accepted" ? "confirmed" : "declined";
    const decisionMessage = isRescheduleDecision
      ? `${decisionMakerName} ${decisionVerb} the proposed new time for ${new Date(booking.requested_start_at).toLocaleString()}.`
      : `${decisionMakerName} ${status} your session request for ${new Date(booking.requested_start_at).toLocaleString()}.`;
    const updated = await tutorModel.bookings.updateStatus(bookingId, status);

    const recipientId = booking.reschedule_proposed_by ?? booking.student_id;
    await notificationModel.notifyUser(
      recipientId,
      status === "accepted" ? "TUTOR_BOOKING_ACCEPTED" : "TUTOR_BOOKING_DECLINED",
      {
        title: isRescheduleDecision
          ? `Your proposed new time was ${decisionVerb}`
          : status === "accepted" ? "Your booking was accepted" : "Your booking was declined",
        message: decisionMessage,
        bookingId,
      },
    );

    // Not awaited — a real email provider's round-trip must never delay
    // this response; the in-app notification above already reflects the
    // decision immediately, and the email is genuinely best-effort.
    emailService
      .sendEmail({
        to: recipientEmail,
        subject: isRescheduleDecision
          ? `Your proposed tutoring time was ${decisionVerb}`
          : `Your tutoring session request was ${status}`,
        text: [
          decisionMessage,
          `View your bookings: ${bookingsUrl()}`,
        ].join("\n"),
      })
      .catch((err) => logger.error({ err, bookingId }, "Failed to email student about booking decision"));

    if (status === "accepted") {
      const profile = await tutorModel.profiles.findByUserId(booking.tutor_id);
      const eventId = await googleCalendarService.createEventIfConnected({
        refreshTokenEncrypted: profile?.google_calendar_refresh_token_encrypted ?? null,
        decrypt: decryptSecret,
        tutorEmail: booking.tutor_email,
        studentEmail: booking.student_email,
        summary: `Tutoring session: ${booking.tutor_name ?? "Tutor"} & ${booking.student_name ?? "Student"}`,
        description: booking.subject_name ? `Subject: ${booking.subject_name}` : "JomDekan tutoring session",
        startAt: new Date(booking.requested_start_at),
        durationMinutes: booking.duration_minutes,
      });
      if (eventId) await tutorModel.bookings.setCalendarEventId(bookingId, eventId);
    }

    const full = await tutorModel.bookings.findById(bookingId);
    return full ? toApiBooking(full) : updated;
  },

  async rescheduleBooking(
    userId: string,
    bookingId: string,
    data: { requestedStartAt: Date; durationMinutes?: number },
  ) {
    const booking = await tutorModel.bookings.findById(bookingId);
    if (!booking) throw AppError.notFound("Booking not found.");
    if (booking.tutor_id !== userId && booking.student_id !== userId) throw AppError.forbidden();
    if (booking.status === "declined") throw AppError.badRequest("A declined booking can't be rescheduled.");
    if (data.requestedStartAt.getTime() <= Date.now()) {
      throw AppError.badRequest("The new session time must be in the future.");
    }

    const isTutor = booking.tutor_id === userId;
    const proposer = isTutor ? booking.tutor_name ?? "The tutor" : booking.student_name ?? "The student";
    const otherPartyId = isTutor ? booking.student_id : booking.tutor_id;
    const otherPartyEmail = isTutor ? booking.student_email : booking.tutor_email;
    const wasAccepted = booking.status === "accepted";

    // The old confirmed time is no longer valid — cancel its calendar
    // event (best-effort) before clearing it, so attendees don't keep a
    // phantom invite at the wrong time.
    if (wasAccepted && booking.google_calendar_event_id) {
      const profile = await tutorModel.profiles.findByUserId(booking.tutor_id);
      await googleCalendarService.deleteEventIfConnected({
        refreshTokenEncrypted: profile?.google_calendar_refresh_token_encrypted ?? null,
        decrypt: decryptSecret,
        eventId: booking.google_calendar_event_id,
      });
    }

    const updated = await tutorModel.bookings.reschedule(bookingId, {
      requestedStartAt: data.requestedStartAt,
      durationMinutes: data.durationMinutes ?? booking.duration_minutes,
      proposedBy: userId,
    });

    await notificationModel.notifyUser(otherPartyId, "TUTOR_BOOKING_RESCHEDULED", {
      title: "A session was rescheduled",
      message: `${proposer} proposed a new time: ${data.requestedStartAt.toLocaleString()}. Please confirm or decline it.`,
      bookingId,
    });

    // A plain chat message in the same thread so there's a visible record
    // of the change — the existing booking-request card (if any) already
    // reflects the live status/time via its own lookup, this just
    // announces it. Sent as the proposer.
    try {
      const conversation = await messageModel.conversations.findOrCreate(booking.tutor_id, booking.student_id);
      await messageModel.messages.create(
        conversation.id,
        userId,
        `${proposer} proposed rescheduling to ${data.requestedStartAt.toLocaleString()}.`,
        {
          messageType: "booking_request",
          metadata: {
            bookingId,
            subjectName: booking.subject_name,
            requestedStartAt: data.requestedStartAt.toISOString(),
            durationMinutes: data.durationMinutes ?? booking.duration_minutes,
            note: "Please confirm or decline the proposed new time.",
            studentName: booking.student_name,
            studentEmail: booking.student_email,
            studentPhone: booking.student_phone,
            isReschedule: true,
          },
        },
      );
    } catch (err) {
      logger.error({ err, bookingId }, "Failed to send reschedule message");
    }

    emailService
      .sendEmail({
        to: otherPartyEmail,
        subject: "Your tutoring session was rescheduled",
        text: [
          `${proposer} proposed a new time for your tutoring session: ${data.requestedStartAt.toLocaleString()}.`,
          "Please confirm or decline the proposed new time.",
          `View your bookings: ${bookingsUrl()}`,
        ].join("\n"),
      })
      .catch((err) => logger.error({ err, bookingId }, "Failed to email about rescheduled booking"));

    const full = await tutorModel.bookings.findById(bookingId);
    return full ? toApiBooking(full) : updated;
  },

  // ---- Google Calendar connect flow ----------------------------------
  async getGoogleCalendarAuthUrl(userId: string) {
    const isVerified = await tutorModel.profiles.isVerified(userId);
    if (!isVerified) throw AppError.forbidden("You are not a verified tutor.");
    const state = await tutorModel.oauthStates.create(userId, "google_calendar");
    return googleCalendarService.getAuthUrl(state);
  },

  async handleGoogleCalendarCallback(state: string, code: string) {
    const consumed = await tutorModel.oauthStates.consume(state, "google_calendar");
    if (!consumed) throw AppError.badRequest("This connection link has expired. Please try again.");

    const tokens = await googleCalendarService.exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      throw AppError.badRequest(
        "Google did not return a refresh token. Please revoke JomDekan's access in your Google account and try connecting again.",
      );
    }

    const user = await userModel.findById(consumed.user_id);
    await tutorModel.profiles.setGoogleCalendarConnection(
      consumed.user_id,
      encryptSecret(tokens.refresh_token),
      user?.email ?? "",
    );
    return { userId: consumed.user_id };
  },

  async disconnectGoogleCalendar(userId: string) {
    await tutorModel.profiles.clearGoogleCalendarConnection(userId);
  },
};
