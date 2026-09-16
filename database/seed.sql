-- =====================================================================
-- JomDekan — development seed data
-- =====================================================================
-- Safe to run repeatedly against a local/dev database (ON CONFLICT DO
-- NOTHING). Never run against production. Contains no real credentials
-- or personal data — university/subject examples only, and they do not
-- imply institutional endorsement.
--
-- Usage:
--   psql -U postgres -d jomdekan -f database/seed.sql
--
-- To create the FIRST ADMIN account, do not seed a password hash here.
-- Register a normal account through the API, then promote it with:
--   npm --prefix backend run create-admin -- --email you@example.com
-- (see backend/src/utils/createAdmin.ts and docs/setup.md)
-- =====================================================================

-- Universities are fully seeded by migration 009 (the real Malaysian
-- university list) — do not insert them here too. Doing so previously
-- created duplicate rows (same name, different slug) that the slug
-- UNIQUE constraint couldn't catch; see migration 011.

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug FROM universities u
CROSS JOIN LATERAL (VALUES
    ('Faculty of Computer and Mathematical Sciences', 'computer-and-mathematical-sciences'),
    ('Faculty of Law', 'law')
) AS f(name, slug)
WHERE u.slug = 'universiti-teknologi-mara'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level)
SELECT f.id, p.name, p.slug, p.study_level FROM faculties f
CROSS JOIN LATERAL (VALUES
    ('Bachelor of Computer Science (Hons)', 'computer-science', 'DEGREE'),
    ('Diploma in Computer Science', 'diploma-computer-science', 'DIPLOMA')
) AS p(name, slug, study_level)
WHERE f.slug = 'computer-and-mathematical-sciences'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level)
SELECT f.id, 'Bachelor of Laws (Hons)', 'law-llb', 'DEGREE' FROM faculties f
WHERE f.slug = 'law'
ON CONFLICT (faculty_id, slug) DO NOTHING;

-- Seeded catalogue-wide (no university_id) same as before migration 041
-- introduced per-university scoping — these predate that and there's no
-- reliable single university to assign them to. Can't use
-- `ON CONFLICT (code)` any more (that constraint is gone; uniqueness is
-- now per-university, and these rows are intentionally university_id
-- NULL), so idempotency is a plain existence check instead.
INSERT INTO subjects (code, name)
SELECT v.code, v.name FROM (VALUES
    ('CSC510', 'Software Engineering'),
    ('CSC548', 'Database Systems'),
    ('CSC577', 'Artificial Intelligence'),
    ('LAW404', 'Law of Contract II')
) AS v(code, name)
WHERE NOT EXISTS (
    SELECT 1 FROM subjects s WHERE s.code = v.code AND s.university_id IS NULL
);

INSERT INTO programme_subjects (programme_id, subject_id, recommended_year, recommended_semester, curriculum_year)
SELECT p.id, s.id, 3, 1, 2024
FROM programmes p, subjects s
WHERE p.slug = 'computer-science' AND s.code = 'CSC510'
ON CONFLICT DO NOTHING;

INSERT INTO programme_subjects (programme_id, subject_id, recommended_year, recommended_semester, curriculum_year)
SELECT p.id, s.id, 3, 2, 2024
FROM programmes p, subjects s
WHERE p.slug = 'computer-science' AND s.code = 'CSC548'
ON CONFLICT DO NOTHING;
