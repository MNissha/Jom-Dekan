import { Router } from "express";
import multer from "multer";
import { tutorController } from "../controllers/tutorController";
import { authenticate } from "../config/middleware/authMiddleware";
import { validate } from "../config/middleware/validateMiddleware";
import { verifyStorageTokenMiddleware } from "../config/middleware/storageTokenMiddleware";
import {
  applyTutorSchema,
  updateTutorProfileSchema,
  tutorUserIdParamSchema,
  requestBookingSchema,
  bookingIdParamSchema,
  decideBookingSchema,
  rescheduleBookingSchema,
  resumeUploadIntentSchema,
  applicationIdParamSchema,
} from "../validators/tutorValidators";

const router = Router();

// Matches tutorService's own MAX_RESUME_SIZE_BYTES — kept here too so
// multer rejects an oversized upload before it's even fully received,
// not just after.
const uploadResume = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * @openapi
 * /tutors/resume-upload-intent:
 *   post:
 *     tags: [Tutors]
 *     summary: Start an upload for a tutor application's resume/CV (returns a one-shot upload URL)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Upload intent created }
 */
router.post(
  "/resume-upload-intent",
  authenticate,
  validate({ body: resumeUploadIntentSchema }),
  tutorController.getResumeUploadIntent,
);

/**
 * @openapi
 * /tutors/resume-upload:
 *   put:
 *     tags: [Tutors]
 *     summary: Upload the file bytes for a pending resume upload intent (token + auth required)
 *     responses:
 *       200: { description: Resume uploaded }
 *       401: { description: Invalid or expired link }
 */
router.put(
  "/resume-upload",
  verifyStorageTokenMiddleware("upload"),
  authenticate,
  uploadResume.single("file"),
  tutorController.receiveResumeUpload,
);

/**
 * @openapi
 * /tutors/applications/{id}/resume:
 *   get:
 *     tags: [Tutors]
 *     summary: Get a short-lived signed download URL for an application's resume (the applicant or an admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Signed download URL }
 *       403: { description: Not the applicant or an admin }
 *       404: { description: Application or resume not found }
 */
router.get(
  "/applications/:id/resume",
  authenticate,
  validate({ params: applicationIdParamSchema }),
  tutorController.getApplicationResumeUrl,
);

/**
 * @openapi
 * /tutors/apply:
 *   post:
 *     tags: [Tutors]
 *     summary: Apply to become a verified tutor
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Application submitted }
 *       409: { description: A pending application already exists }
 */
router.post("/apply", authenticate, validate({ body: applyTutorSchema }), tutorController.apply);

router.get("/me/application", authenticate, tutorController.getMyApplication);

router.patch("/me", authenticate, validate({ body: updateTutorProfileSchema }), tutorController.updateMyProfile);

router.get("/me/bookings", authenticate, tutorController.listMyBookingsAsTutor);
router.get("/me/bookings/as-student", authenticate, tutorController.listMyBookingsAsStudent);
router.get("/me/students", authenticate, tutorController.listMyStudents);

router.get("/me/google-calendar/auth-url", authenticate, tutorController.getGoogleCalendarAuthUrl);
router.delete("/me/google-calendar", authenticate, tutorController.disconnectGoogleCalendar);

/**
 * @openapi
 * /tutors/google-calendar/callback:
 *   get:
 *     tags: [Tutors]
 *     summary: Google OAuth redirect target for the "Connect Google Calendar" flow (not an authenticated API call — hit directly by the browser)
 *     responses:
 *       302: { description: Redirects back to the frontend profile page }
 */
router.get("/google-calendar/callback", tutorController.googleCalendarCallback);

/**
 * @openapi
 * /tutors/{userId}/bookings:
 *   post:
 *     tags: [Tutors]
 *     summary: Request a tutoring session with a verified tutor
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Booking request sent }
 *       409: { description: That slot has already been requested }
 */
router.post(
  "/:userId/bookings",
  authenticate,
  validate({ params: tutorUserIdParamSchema, body: requestBookingSchema }),
  tutorController.requestBooking,
);

router.get(
  "/bookings/:id",
  authenticate,
  validate({ params: bookingIdParamSchema }),
  tutorController.getBookingById,
);

router.patch(
  "/bookings/:id/status",
  authenticate,
  validate({ params: bookingIdParamSchema, body: decideBookingSchema }),
  tutorController.decideBooking,
);

/**
 * @openapi
 * /tutors/bookings/{id}/reschedule:
 *   patch:
 *     tags: [Tutors]
 *     summary: Propose a new date/time for a booking (either party) — resets an already-accepted booking to pending
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking rescheduled }
 *       400: { description: Booking already declined, or the new time is not in the future }
 *       409: { description: That slot has already been requested }
 */
router.patch(
  "/bookings/:id/reschedule",
  authenticate,
  validate({ params: bookingIdParamSchema, body: rescheduleBookingSchema }),
  tutorController.rescheduleBooking,
);

/**
 * @openapi
 * /tutors/{userId}/resume:
 *   get:
 *     tags: [Tutors]
 *     summary: Get a short-lived signed download URL for a verified tutor's resume (that tutor or an admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Signed download URL }
 *       403: { description: Not that tutor or an admin }
 *       404: { description: Not a verified tutor, or no resume on file }
 */
router.get(
  "/:userId/resume",
  authenticate,
  validate({ params: tutorUserIdParamSchema }),
  tutorController.getProfileResumeUrl,
);

/**
 * @openapi
 * /tutors/{userId}:
 *   get:
 *     tags: [Tutors]
 *     summary: Get a user's verified tutor profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tutor profile }
 *       404: { description: Not a verified tutor }
 */
router.get("/:userId", authenticate, validate({ params: tutorUserIdParamSchema }), tutorController.getTutorProfile);

export default router;
