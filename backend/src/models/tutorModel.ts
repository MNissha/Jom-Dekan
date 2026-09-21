import { pool } from "../config/config/db";

export type TutorApplicationStatus = "pending" | "approved" | "rejected";
export type TutorBookingStatus = "pending" | "accepted" | "declined";
export type TutorSessionMode = "ONLINE" | "ON_CAMPUS" | "HYBRID";

export interface TutorApplicationRow {
  id: string;
  user_id: string;
  bio: string;
  subjects: string[];
  experience: string;
  hourly_rate: string | null;
  open_to_other_universities: boolean;
  resume_storage_key: string | null;
  resume_original_filename: string | null;
  resume_mime_type: string | null;
  resume_size_bytes: number | null;
  portfolio_url: string | null;
  mode: TutorSessionMode;
  location_address: string | null;
  online_platform: string | null;
  status: TutorApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TutorApplicationWithApplicant extends TutorApplicationRow {
  applicant_email: string;
  applicant_name: string | null;
  applicant_phone: string | null;
}

export interface TutorProfileRow {
  user_id: string;
  bio: string;
  subjects: string[];
  hourly_rate: string | null;
  experience: string | null;
  open_to_other_universities: boolean;
  resume_storage_key: string | null;
  resume_original_filename: string | null;
  resume_mime_type: string | null;
  resume_size_bytes: number | null;
  portfolio_url: string | null;
  mode: TutorSessionMode;
  location_address: string | null;
  online_platform: string | null;
  is_active: boolean;
  verified_at: Date;
  google_calendar_connected: boolean;
  google_calendar_refresh_token_encrypted: string | null;
  google_calendar_email: string | null;
  source_application_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TutorBookingRow {
  id: string;
  tutor_id: string;
  student_id: string;
  subject_id: string | null;
  requested_start_at: Date;
  duration_minutes: number;
  message: string | null;
  status: TutorBookingStatus;
  reschedule_proposed_by: string | null;
  google_calendar_event_id: string | null;
  // Captured on the request form itself, not resolved from the
  // student's account — profile phone is optional and often blank, so
  // this is the only way to guarantee the tutor has a way to reach them.
  contact_email: string;
  contact_phone: string;
  created_at: Date;
  updated_at: Date;
}

export interface TutorBookingWithContext extends TutorBookingRow {
  tutor_email: string;
  tutor_name: string | null;
  tutor_phone: string | null;
  student_email: string;
  student_name: string | null;
  student_phone: string | null;
  subject_name: string | null;
}

/**
 * Parameterized SQL only, no Express req/res — same rule as
 * userModel/messageModel.
 */
export const tutorModel = {
  applications: {
    async create(
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
        mode: TutorSessionMode;
        locationAddress?: string;
        onlinePlatform?: string;
      },
    ): Promise<TutorApplicationRow> {
      const result = await pool.query<TutorApplicationRow>(
        `INSERT INTO tutor_applications
           (user_id, bio, subjects, experience, hourly_rate, open_to_other_universities,
            resume_storage_key, resume_original_filename, resume_mime_type, resume_size_bytes, portfolio_url,
            mode, location_address, online_platform)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          userId,
          data.bio,
          JSON.stringify(data.subjects),
          data.experience,
          data.hourlyRate ?? null,
          data.openToOtherUniversities ?? false,
          data.resumeStorageKey,
          data.resumeOriginalFilename,
          data.resumeMimeType,
          data.resumeSizeBytes,
          data.portfolioUrl ?? null,
          data.mode,
          data.locationAddress ?? null,
          data.onlinePlatform ?? null,
        ],
      );
      return result.rows[0];
    },

    async findLatestForUser(userId: string): Promise<TutorApplicationRow | null> {
      const result = await pool.query<TutorApplicationRow>(
        `SELECT * FROM tutor_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId],
      );
      return result.rows[0] ?? null;
    },

    async findById(id: string): Promise<TutorApplicationRow | null> {
      const result = await pool.query<TutorApplicationRow>(
        `SELECT * FROM tutor_applications WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async listByStatus(status: TutorApplicationStatus): Promise<TutorApplicationWithApplicant[]> {
      const result = await pool.query<TutorApplicationWithApplicant>(
        `SELECT a.*, u.email AS applicant_email, up.display_name AS applicant_name, up.phone AS applicant_phone
         FROM tutor_applications a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN user_profiles up ON up.user_id = a.user_id
         WHERE a.status = $1
         ORDER BY a.created_at ASC`,
        [status],
      );
      return result.rows;
    },

    async findByIdWithApplicant(id: string): Promise<TutorApplicationWithApplicant | null> {
      const result = await pool.query<TutorApplicationWithApplicant>(
        `SELECT a.*, u.email AS applicant_email, up.display_name AS applicant_name, up.phone AS applicant_phone
         FROM tutor_applications a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN user_profiles up ON up.user_id = a.user_id
         WHERE a.id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async remove(id: string): Promise<boolean> {
      const result = await pool.query<{ id: string }>(
        `DELETE FROM tutor_applications WHERE id = $1 RETURNING id`,
        [id],
      );
      return Boolean(result.rows[0]);
    },

    async decide(
      id: string,
      status: "approved" | "rejected",
      reviewerId: string,
      rejectionReason: string | null,
    ): Promise<TutorApplicationRow | null> {
      const result = await pool.query<TutorApplicationRow>(
        `UPDATE tutor_applications
         SET status = $2, reviewed_by = $3, reviewed_at = now(), rejection_reason = $4
         WHERE id = $1
         RETURNING *`,
        [id, status, reviewerId, rejectionReason],
      );
      return result.rows[0] ?? null;
    },
  },

  profiles: {
    async isVerified(userId: string): Promise<boolean> {
      const result = await pool.query(`SELECT 1 FROM tutor_profiles WHERE user_id = $1`, [userId]);
      return result.rowCount !== null && result.rowCount > 0;
    },

    async findByUserId(userId: string): Promise<TutorProfileRow | null> {
      const result = await pool.query<TutorProfileRow>(
        `SELECT * FROM tutor_profiles WHERE user_id = $1`,
        [userId],
      );
      return result.rows[0] ?? null;
    },

    /**
     * `sourceApplicationId` ties this tag to the application that
     * granted it — pass the application's id when this is the result of
     * an approval so deleting that application later cascades to
     * revoke the tag (see migration 039); pass null for a tag an admin
     * grants directly, with no application behind it.
     */
    async upsertFromApplication(
      userId: string,
      data: {
        bio: string;
        subjects: string[];
        experience: string;
        hourlyRate?: number | null;
        openToOtherUniversities?: boolean;
        resumeStorageKey?: string | null;
        resumeOriginalFilename?: string | null;
        resumeMimeType?: string | null;
        resumeSizeBytes?: number | null;
        portfolioUrl?: string | null;
        mode: TutorSessionMode;
        locationAddress?: string | null;
        onlinePlatform?: string | null;
        sourceApplicationId: string | null;
      },
    ): Promise<TutorProfileRow> {
      const result = await pool.query<TutorProfileRow>(
        `INSERT INTO tutor_profiles
           (user_id, bio, subjects, experience, hourly_rate, open_to_other_universities,
            resume_storage_key, resume_original_filename, resume_mime_type, resume_size_bytes,
            portfolio_url, mode, location_address, online_platform, source_application_id)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (user_id) DO UPDATE SET
           bio = EXCLUDED.bio, subjects = EXCLUDED.subjects, experience = EXCLUDED.experience,
           hourly_rate = EXCLUDED.hourly_rate, open_to_other_universities = EXCLUDED.open_to_other_universities,
           resume_storage_key = EXCLUDED.resume_storage_key,
           resume_original_filename = EXCLUDED.resume_original_filename,
           resume_mime_type = EXCLUDED.resume_mime_type,
           resume_size_bytes = EXCLUDED.resume_size_bytes,
           portfolio_url = EXCLUDED.portfolio_url,
           mode = EXCLUDED.mode, location_address = EXCLUDED.location_address, online_platform = EXCLUDED.online_platform,
           is_active = true, verified_at = now(),
           source_application_id = EXCLUDED.source_application_id
         RETURNING *`,
        [
          userId,
          data.bio,
          JSON.stringify(data.subjects),
          data.experience,
          data.hourlyRate ?? null,
          data.openToOtherUniversities ?? false,
          data.resumeStorageKey ?? null,
          data.resumeOriginalFilename ?? null,
          data.resumeMimeType ?? null,
          data.resumeSizeBytes ?? null,
          data.portfolioUrl ?? null,
          data.mode,
          data.locationAddress ?? null,
          data.onlinePlatform ?? null,
          data.sourceApplicationId,
        ],
      );
      return result.rows[0];
    },

    async remove(userId: string): Promise<boolean> {
      const result = await pool.query<{ user_id: string }>(
        `DELETE FROM tutor_profiles WHERE user_id = $1 RETURNING user_id`,
        [userId],
      );
      return Boolean(result.rows[0]);
    },

    async findBySourceApplicationId(applicationId: string): Promise<TutorProfileRow | null> {
      const result = await pool.query<TutorProfileRow>(
        `SELECT * FROM tutor_profiles WHERE source_application_id = $1`,
        [applicationId],
      );
      return result.rows[0] ?? null;
    },

    async update(
      userId: string,
      data: {
        bio?: string;
        subjects?: string[];
        hourlyRate?: number | null;
        experience?: string;
        isActive?: boolean;
        openToOtherUniversities?: boolean;
        resumeStorageKey?: string;
        resumeOriginalFilename?: string;
        resumeMimeType?: string;
        resumeSizeBytes?: number;
        portfolioUrl?: string | null;
        mode?: TutorSessionMode;
        locationAddress?: string | null;
        onlinePlatform?: string | null;
      },
    ): Promise<TutorProfileRow | null> {
      const result = await pool.query<TutorProfileRow>(
        `UPDATE tutor_profiles SET
           bio = COALESCE($2, bio),
           subjects = COALESCE($3::jsonb, subjects),
           hourly_rate = COALESCE($4, hourly_rate),
           experience = COALESCE($5, experience),
           is_active = COALESCE($6, is_active),
           open_to_other_universities = COALESCE($7, open_to_other_universities),
           resume_storage_key = COALESCE($8, resume_storage_key),
           resume_original_filename = COALESCE($9, resume_original_filename),
           resume_mime_type = COALESCE($10, resume_mime_type),
           resume_size_bytes = COALESCE($11, resume_size_bytes),
           portfolio_url = COALESCE($12, portfolio_url),
           mode = COALESCE($13, mode),
           location_address = COALESCE($14, location_address),
           online_platform = COALESCE($15, online_platform)
         WHERE user_id = $1
         RETURNING *`,
        [
          userId,
          data.bio ?? null,
          data.subjects ? JSON.stringify(data.subjects) : null,
          data.hourlyRate ?? null,
          data.experience ?? null,
          data.isActive ?? null,
          data.openToOtherUniversities ?? null,
          data.resumeStorageKey ?? null,
          data.resumeOriginalFilename ?? null,
          data.resumeMimeType ?? null,
          data.resumeSizeBytes ?? null,
          data.portfolioUrl ?? null,
          data.mode ?? null,
          data.locationAddress ?? null,
          data.onlinePlatform ?? null,
        ],
      );
      return result.rows[0] ?? null;
    },

    async setGoogleCalendarConnection(
      userId: string,
      refreshTokenEncrypted: string,
      calendarEmail: string,
    ): Promise<void> {
      await pool.query(
        `UPDATE tutor_profiles SET
           google_calendar_connected = true,
           google_calendar_refresh_token_encrypted = $2,
           google_calendar_email = $3
         WHERE user_id = $1`,
        [userId, refreshTokenEncrypted, calendarEmail],
      );
    },

    async clearGoogleCalendarConnection(userId: string): Promise<void> {
      await pool.query(
        `UPDATE tutor_profiles SET
           google_calendar_connected = false,
           google_calendar_refresh_token_encrypted = NULL,
           google_calendar_email = NULL
         WHERE user_id = $1`,
        [userId],
      );
    },
  },

  bookings: {
    async create(
      studentId: string,
      tutorId: string,
      data: {
        subjectId?: string | null;
        requestedStartAt: Date;
        durationMinutes: number;
        message?: string;
        contactEmail: string;
        contactPhone: string;
      },
    ): Promise<TutorBookingRow> {
      const result = await pool.query<TutorBookingRow>(
        `INSERT INTO tutor_bookings (tutor_id, student_id, subject_id, requested_start_at, duration_minutes, message, contact_email, contact_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          tutorId,
          studentId,
          data.subjectId ?? null,
          data.requestedStartAt,
          data.durationMinutes,
          data.message ?? null,
          data.contactEmail,
          data.contactPhone,
        ],
      );
      return result.rows[0];
    },

    async findById(id: string): Promise<TutorBookingWithContext | null> {
      const result = await pool.query<TutorBookingWithContext>(
        `SELECT b.*,
                tu.email AS tutor_email, tup.display_name AS tutor_name, tup.phone AS tutor_phone,
                su.email AS student_email, sup.display_name AS student_name, sup.phone AS student_phone,
                s.name AS subject_name
         FROM tutor_bookings b
         JOIN users tu ON tu.id = b.tutor_id
         LEFT JOIN user_profiles tup ON tup.user_id = b.tutor_id
         JOIN users su ON su.id = b.student_id
         LEFT JOIN user_profiles sup ON sup.user_id = b.student_id
         LEFT JOIN subjects s ON s.id = b.subject_id
         WHERE b.id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async listForTutor(tutorId: string): Promise<TutorBookingWithContext[]> {
      const result = await pool.query<TutorBookingWithContext>(
        `SELECT b.*,
                tu.email AS tutor_email, tup.display_name AS tutor_name, tup.phone AS tutor_phone,
                su.email AS student_email, sup.display_name AS student_name, sup.phone AS student_phone,
                s.name AS subject_name
         FROM tutor_bookings b
         JOIN users tu ON tu.id = b.tutor_id
         LEFT JOIN user_profiles tup ON tup.user_id = b.tutor_id
         JOIN users su ON su.id = b.student_id
         LEFT JOIN user_profiles sup ON sup.user_id = b.student_id
         LEFT JOIN subjects s ON s.id = b.subject_id
         WHERE b.tutor_id = $1
         ORDER BY b.requested_start_at DESC`,
        [tutorId],
      );
      return result.rows;
    },

    async listForStudent(studentId: string): Promise<TutorBookingWithContext[]> {
      const result = await pool.query<TutorBookingWithContext>(
        `SELECT b.*,
                tu.email AS tutor_email, tup.display_name AS tutor_name, tup.phone AS tutor_phone,
                su.email AS student_email, sup.display_name AS student_name, sup.phone AS student_phone,
                s.name AS subject_name
         FROM tutor_bookings b
         JOIN users tu ON tu.id = b.tutor_id
         LEFT JOIN user_profiles tup ON tup.user_id = b.tutor_id
         JOIN users su ON su.id = b.student_id
         LEFT JOIN user_profiles sup ON sup.user_id = b.student_id
         LEFT JOIN subjects s ON s.id = b.subject_id
         WHERE b.student_id = $1
         ORDER BY b.requested_start_at DESC`,
        [studentId],
      );
      return result.rows;
    },

    /** Distinct students the tutor has at least one accepted booking with. */
    async listStudentsForTutor(
      tutorId: string,
    ): Promise<Array<{ student_id: string; student_name: string | null; student_email: string; session_count: number; last_session_at: Date }>> {
      const result = await pool.query(
        `SELECT su.id AS student_id, sup.display_name AS student_name, su.email AS student_email,
                COUNT(*)::int AS session_count, MAX(b.requested_start_at) AS last_session_at
         FROM tutor_bookings b
         JOIN users su ON su.id = b.student_id
         LEFT JOIN user_profiles sup ON sup.user_id = b.student_id
         WHERE b.tutor_id = $1 AND b.status = 'accepted'
         GROUP BY su.id, sup.display_name, su.email
         ORDER BY last_session_at DESC`,
        [tutorId],
      );
      return result.rows;
    },

    async updateStatus(id: string, status: "accepted" | "declined"): Promise<TutorBookingRow | null> {
      const result = await pool.query<TutorBookingRow>(
        `UPDATE tutor_bookings
         SET status = $2, reschedule_proposed_by = NULL
         WHERE id = $1
         RETURNING *`,
        [id, status],
      );
      return result.rows[0] ?? null;
    },

    async setCalendarEventId(id: string, eventId: string): Promise<void> {
      await pool.query(`UPDATE tutor_bookings SET google_calendar_event_id = $2 WHERE id = $1`, [id, eventId]);
    },

    /**
     * Moving the time invalidates any prior confirmation — if the booking
     * was 'accepted', this resets it to 'pending' (the tutor must
     * reconfirm the new time via the normal accept/decline flow) and
     * clears any existing calendar event id, since the caller is
     * responsible for best-effort-deleting the actual Google Calendar
     * event before calling this.
     */
    async reschedule(
      id: string,
      data: { requestedStartAt: Date; durationMinutes: number; proposedBy: string },
    ): Promise<TutorBookingRow | null> {
      const result = await pool.query<TutorBookingRow>(
        `UPDATE tutor_bookings SET
           requested_start_at = $2,
           duration_minutes = $3,
           status = 'pending',
           google_calendar_event_id = NULL,
           reschedule_proposed_by = $4
         WHERE id = $1
         RETURNING *`,
        [id, data.requestedStartAt, data.durationMinutes, data.proposedBy],
      );
      return result.rows[0] ?? null;
    },
  },

  oauthStates: {
    async create(userId: string, purpose: string, ttlMinutes = 15): Promise<string> {
      const result = await pool.query<{ state: string }>(
        `INSERT INTO oauth_states (user_id, purpose, expires_at)
         VALUES ($1, $2, now() + ($3 || ' minutes')::interval)
         RETURNING state`,
        [userId, purpose, ttlMinutes],
      );
      return result.rows[0].state;
    },

    /** Deletes and returns the state row if present and not expired — single use. */
    async consume(state: string, purpose: string): Promise<{ user_id: string } | null> {
      const result = await pool.query<{ user_id: string }>(
        `DELETE FROM oauth_states
         WHERE state = $1 AND purpose = $2 AND expires_at > now()
         RETURNING user_id`,
        [state, purpose],
      );
      return result.rows[0] ?? null;
    },
  },
};
