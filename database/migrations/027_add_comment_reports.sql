ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES forum_posts(id) ON DELETE SET NULL;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_category_check;
ALTER TABLE reports
    ADD CONSTRAINT reports_category_check CHECK (category IN (
        'INAPPROPRIATE_CONTENT', 'COPYRIGHT_VIOLATION', 'PLAGIARISM',
        'ACADEMIC_DISHONESTY', 'SPAM_OR_SCAM', 'HARASSMENT',
        'MISINFORMATION', 'HATE_OR_ABUSIVE_CONTENT', 'PRIVACY_CONCERN',
        'SCAM_OR_SUSPICIOUS_ACTIVITY', 'OTHER'
    ));

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_comment_report_per_user
    ON reports(reporter_id, entity_id)
    WHERE entity_type = 'forum_comment' AND UPPER(status) = 'PENDING';

ALTER TABLE forum_comments
    ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible';

ALTER TABLE forum_comments DROP CONSTRAINT IF EXISTS forum_comments_moderation_status_check;
ALTER TABLE forum_comments
    ADD CONSTRAINT forum_comments_moderation_status_check
    CHECK (moderation_status IN ('visible', 'restricted', 'removed'));
