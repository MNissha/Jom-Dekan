-- =====================================================================
-- Migration 045: Required contact info on tutor bookings
-- =====================================================================
-- Booking-time contact details, captured explicitly on the request form
-- rather than resolved from the student's account at read time — phone
-- is optional on user_profiles (018_add_profile_phone.sql) and often
-- blank, so relying on it left the tutor with no way to reach the
-- student for many requests. Backfilled from the account/profile for
-- existing rows so historical bookings aren't left blank.

ALTER TABLE tutor_bookings
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30) NOT NULL DEFAULT '';

UPDATE tutor_bookings b
SET contact_email = su.email,
    contact_phone = COALESCE(sup.phone, '')
FROM users su
LEFT JOIN user_profiles sup ON sup.user_id = su.id
WHERE su.id = b.student_id AND b.contact_email = '';

ALTER TABLE tutor_bookings ALTER COLUMN contact_email DROP DEFAULT;
ALTER TABLE tutor_bookings ALTER COLUMN contact_phone DROP DEFAULT;
