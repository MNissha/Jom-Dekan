-- Records who proposed the latest booking time so only the other party can
-- confirm or decline that reschedule. NULL denotes an original request.
ALTER TABLE tutor_bookings
  ADD COLUMN IF NOT EXISTS reschedule_proposed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tutor_bookings_reschedule_proposer
  ON tutor_bookings(reschedule_proposed_by)
  WHERE reschedule_proposed_by IS NOT NULL;
