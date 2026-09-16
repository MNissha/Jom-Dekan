-- Lets a tutor (application and, once approved, their live profile) say
-- whether they're open to teaching students from a different university
-- or programme than their own, for the subjects they've listed. Shown
-- alongside the rest of a tutor's info wherever it already appears
-- (marketplace cards, admin review), not gated by anything.
ALTER TABLE tutor_applications
    ADD COLUMN IF NOT EXISTS open_to_other_universities BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tutor_profiles
    ADD COLUMN IF NOT EXISTS open_to_other_universities BOOLEAN NOT NULL DEFAULT false;
