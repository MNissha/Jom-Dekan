-- Subjects become properly scoped to a university instead of one global
-- catalogue with a system-wide-unique code. Different universities can
-- use the same subject code for a different subject (e.g. CSC577 at
-- UiTM vs CSC577 at UM) — previously impossible since `code` alone had
-- to be unique across the whole table.
--
-- university_id is nullable: existing subject rows were created with no
-- notion of a university at all, and there is no reliable way to infer
-- which university each one belongs to (a subject can be linked to
-- programmes across faculties/universities via programme_subjects), so
-- they are left unscoped rather than guessed. The application treats a
-- NULL university_id as "legacy / catalogue-wide" — see taxonomyModel
-- and taxonomyService for how reads/writes handle it.
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_university_id ON subjects(university_id);

-- Subject code is no longer required — the tutor-facing "Add Subject"
-- flow allows a subject with just a name; duplicate checking falls back
-- to (university_id, normalized name) in that case (see the partial
-- unique index below and taxonomyService.subjects).
ALTER TABLE subjects ALTER COLUMN code DROP NOT NULL;

-- Replace the old "one code for the whole catalogue" rule with a
-- per-university one. Rows that still have university_id = NULL
-- (pre-migration legacy data, or a future admin-created catalogue-wide
-- subject) are intentionally exempt: Postgres never treats two NULLs as
-- equal in a unique index, so legacy rows don't collide with each other
-- or block new per-university rows reusing the same code.
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_university_code
    ON subjects (university_id, code)
    WHERE university_id IS NOT NULL AND code IS NOT NULL;

-- Fallback uniqueness for the optional-code case: within the same
-- university, two subjects with no code can't share the same
-- (trimmed, case-insensitive) name either.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_university_name_no_code
    ON subjects (university_id, lower(btrim(name)))
    WHERE university_id IS NOT NULL AND code IS NULL;
