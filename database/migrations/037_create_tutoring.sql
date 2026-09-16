-- =====================================================================
-- Migration 037: Tutor verification, profiles, and bookings
-- =====================================================================
-- Idempotent-safe: uses IF NOT EXISTS so it can be re-run against a
-- clean database.

-- ---------------------------------------------------------------------
-- tutor_applications — the admin review queue for becoming a verified
-- tutor. A user may have at most one *pending* application at a time
-- (enforced by the partial unique index below) but can re-apply after
-- a rejection.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_applications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio               TEXT NOT NULL,
    subjects          JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience        TEXT NOT NULL,
    hourly_rate       NUMERIC(8,2),
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    rejection_reason  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_applications_pending
    ON tutor_applications(user_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tutor_applications_status ON tutor_applications(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_tutor_applications_updated_at ON tutor_applications;
CREATE TRIGGER trg_tutor_applications_updated_at BEFORE UPDATE ON tutor_applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- tutor_profiles — 1:1 with users, created the moment an application
-- is approved. This is the single source of truth for "is this a
-- verified tutor" — user_profiles.academic_role='TUTOR' is only ever
-- self-declared at registration and must never be trusted for gating.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_profiles (
    user_id                                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio                                     TEXT NOT NULL,
    subjects                                JSONB NOT NULL DEFAULT '[]'::jsonb,
    hourly_rate                             NUMERIC(8,2),
    experience                              TEXT,
    is_active                               BOOLEAN NOT NULL DEFAULT true,
    verified_at                             TIMESTAMPTZ NOT NULL DEFAULT now(),
    google_calendar_connected               BOOLEAN NOT NULL DEFAULT false,
    google_calendar_refresh_token_encrypted TEXT,
    google_calendar_email                   TEXT,
    created_at                              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                              TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_tutor_profiles_updated_at ON tutor_profiles;
CREATE TRIGGER trg_tutor_profiles_updated_at BEFORE UPDATE ON tutor_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- tutor_bookings — a student's request for a session with a verified
-- tutor. Simple request -> accept/decline, not a slot-based
-- availability calendar. The UNIQUE constraint is load-bearing the
-- same way opportunity_applications' is: tutorController relies on
-- the resulting Postgres 23505 error to return a 409 "slot already
-- booked" response.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutor_bookings (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id                UUID REFERENCES subjects(id) ON DELETE SET NULL,
    requested_start_at        TIMESTAMPTZ NOT NULL,
    duration_minutes          INT NOT NULL DEFAULT 60,
    message                   TEXT,
    status                    VARCHAR(20) NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'accepted', 'declined')),
    google_calendar_event_id  TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tutor_id, requested_start_at)
);

CREATE INDEX IF NOT EXISTS idx_tutor_bookings_tutor ON tutor_bookings(tutor_id, status, requested_start_at);
CREATE INDEX IF NOT EXISTS idx_tutor_bookings_student ON tutor_bookings(student_id, requested_start_at DESC);

DROP TRIGGER IF EXISTS trg_tutor_bookings_updated_at ON tutor_bookings;
CREATE TRIGGER trg_tutor_bookings_updated_at BEFORE UPDATE ON tutor_bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- oauth_states — short-lived, single-use tokens correlating a Google
-- OAuth consent redirect (a top-level browser navigation, not an XHR)
-- back to the authenticated user who started it. A row is deleted the
-- moment it's consumed by the callback; the state value itself is an
-- unguessable random UUID, so an unconsumed/expired leftover row is
-- harmless either way.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_states (
    state       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(50) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
