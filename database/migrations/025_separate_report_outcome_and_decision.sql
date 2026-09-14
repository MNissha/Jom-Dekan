-- Keep report workflow outcome separate from the concrete moderation action.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

UPDATE reports
SET status = CASE status
    WHEN 'pending' THEN 'PENDING'
    WHEN 'resolved' THEN 'RESOLVED_APPROVED'
    WHEN 'dismissed' THEN 'RESOLVED_REJECTED'
    ELSE status
END;

ALTER TABLE reports
    ALTER COLUMN status SET DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS moderation_decision VARCHAR(40),
    ADD COLUMN IF NOT EXISTS admin_response_title VARCHAR(160),
    ADD COLUMN IF NOT EXISTS admin_response_message TEXT,
    ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notification_delivery_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR(20);

ALTER TABLE reports
    ADD CONSTRAINT reports_status_check
    CHECK (status IN ('PENDING', 'RESOLVED_APPROVED', 'RESOLVED_REJECTED'));

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_moderation_decision_check;
ALTER TABLE reports
    ADD CONSTRAINT reports_moderation_decision_check
    CHECK (moderation_decision IS NULL OR moderation_decision IN (
        'CONTENT_REMOVAL', 'POLICY_WARNING', 'CONTENT_RESTRICTION',
        'ACCOUNT_WARNING', 'LISTING_SUSPENSION', 'NO_VIOLATION_FOUND',
        'INSUFFICIENT_EVIDENCE', 'CONTENT_WITHIN_GUIDELINES',
        'REPORT_NOT_APPLICABLE', 'DUPLICATE_REPORT'
    ));

CREATE INDEX IF NOT EXISTS idx_reports_moderation_decision
    ON reports(moderation_decision);
