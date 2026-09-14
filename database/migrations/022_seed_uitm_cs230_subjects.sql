-- =====================================================================
-- Migration 022: UiTM CDCS230 (Bachelor of Computer Science, Hons) course
-- outline — the one programme in the catalogue with real subject codes
-- (from the official course-outline printout, not the source page used
-- for Migration 021, which only had titles/semesters with codes withheld).
-- =====================================================================
-- Idempotent-safe: programme matched by (faculty, slug), subjects by
-- code, links by (programme, subject, curriculum_year) — all guarded by
-- ON CONFLICT / NOT EXISTS.

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, 'CDCS230 - Ijazah Sarjana Muda Sains Komputer (Kepujian)', 'cdcs230-ijazah-sarjana-muda-sains-komputer-kepujian', 'DEGREE', NULL
FROM universities u
JOIN faculties fac ON fac.university_id = u.id AND fac.name = 'Fakulti Sains Komputer dan Matematik'
WHERE u.slug = 'universiti-teknologi-mara'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO subjects (code, name, source, verification_status) VALUES
    ('CSC402', 'Programming I', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC413', 'Introduction to Interactive Multimedia', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC429', 'Computer Organization and Architecture', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CTU552', 'Philosophy and Current Issues', 'ADMIN', 'ADMIN_VERIFIED'),
    ('HBU111', 'National Kesatria I', 'ADMIN', 'ADMIN_VERIFIED'),
    ('ICT450', 'Database Design and Development', 'ADMIN', 'ADMIN_VERIFIED'),
    ('MAT406', 'Foundation Mathematics', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC404', 'Programming II', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CTU554', 'Values and Civilization II', 'ADMIN', 'ADMIN_VERIFIED'),
    ('HBU121', 'National Kesatria II', 'ADMIN', 'ADMIN_VERIFIED'),
    ('ICT502', 'Database Engineering', 'ADMIN', 'ADMIN_VERIFIED'),
    ('ITT400', 'Introduction to Data Communication and Networking', 'ADMIN', 'ADMIN_VERIFIED'),
    ('MAT421', 'Calculus I', 'ADMIN', 'ADMIN_VERIFIED'),
    ('STA416', 'Applied Probability and Statistics', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC435', 'Object-Oriented Programming', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC510', 'Discrete Structures', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC520', 'Principles of Operating Systems', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC583', 'Artificial Intelligence Algorithms', 'ADMIN', 'ADMIN_VERIFIED'),
    ('HBU131', 'National Kesatria III', 'ADMIN', 'ADMIN_VERIFIED'),
    ('LCC401', 'English for Mediating Texts', 'ADMIN', 'ADMIN_VERIFIED'),
    ('MAT423', 'Linear Algebra I', 'ADMIN', 'ADMIN_VERIFIED'),
    ('TMC401', 'Introductory Mandarin (Level I)', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC508', 'Data Structures', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC569', 'Principles of Compilers', 'ADMIN', 'ADMIN_VERIFIED'),
    ('GSC575', 'Software Project Management', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC577', 'Software Engineering - Theories and Principles', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC584', 'Enterprise Programming', 'ADMIN', 'ADMIN_VERIFIED'),
    ('LCC500', 'English for Workplace Communication', 'ADMIN', 'ADMIN_VERIFIED'),
    ('TMC451', 'Introductory Mandarin (Level II)', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC580', 'Parallel Processing', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC645', 'Algorithm Analysis and Design', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC649', 'Special Topics in Computer Science', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSP600', 'Project Formulation', 'ADMIN', 'ADMIN_VERIFIED'),
    ('ENT600', 'Technology Entrepreneurship', 'ADMIN', 'ADMIN_VERIFIED'),
    ('STA404', 'Statistics for Business and Social Sciences', 'ADMIN', 'ADMIN_VERIFIED'),
    ('TMC501', 'Introductory Mandarin (Level III)', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC562', 'Information Retrieval and Searching Algorithms', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC662', 'Computer Security', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSC683', 'Game Design and Development', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CSP650', 'Project', 'ADMIN', 'ADMIN_VERIFIED'),
    ('EET699', 'English Exit Test', 'ADMIN', 'ADMIN_VERIFIED'),
    ('ICT652', 'Ethical, Social, and Professional Issues in ICT', 'ADMIN', 'ADMIN_VERIFIED'),
    ('CST688', 'Computing Science Industrial Training', 'ADMIN', 'ADMIN_VERIFIED')
ON CONFLICT (code) DO NOTHING;

INSERT INTO programme_subjects (programme_id, subject_id, curriculum_year, recommended_semester)
SELECT p.id, s.id, 2024, v.semester
FROM universities u
JOIN faculties fac ON fac.university_id = u.id AND fac.name = 'Fakulti Sains Komputer dan Matematik'
JOIN programmes p ON p.faculty_id = fac.id AND p.slug = 'cdcs230-ijazah-sarjana-muda-sains-komputer-kepujian'
JOIN (VALUES
    ('CSC402', 1),
    ('CSC413', 1),
    ('CSC429', 1),
    ('CTU552', 1),
    ('HBU111', 1),
    ('ICT450', 1),
    ('MAT406', 1),
    ('CSC404', 2),
    ('CTU554', 2),
    ('HBU121', 2),
    ('ICT502', 2),
    ('ITT400', 2),
    ('MAT421', 2),
    ('STA416', 2),
    ('CSC435', 3),
    ('CSC510', 3),
    ('CSC520', 3),
    ('CSC583', 3),
    ('HBU131', 3),
    ('LCC401', 3),
    ('MAT423', 3),
    ('TMC401', 3),
    ('CSC508', 4),
    ('CSC569', 4),
    ('GSC575', 4),
    ('CSC577', 4),
    ('CSC584', 4),
    ('LCC500', 4),
    ('TMC451', 4),
    ('CSC580', 5),
    ('CSC645', 5),
    ('CSC649', 5),
    ('CSP600', 5),
    ('ENT600', 5),
    ('STA404', 5),
    ('TMC501', 5),
    ('CSC562', 6),
    ('CSC662', 6),
    ('CSC683', 6),
    ('CSP650', 6),
    ('EET699', 6),
    ('ICT652', 6),
    ('CST688', 7)
) AS v(code, semester) ON true
JOIN subjects s ON s.code = v.code
WHERE u.slug = 'universiti-teknologi-mara'
ON CONFLICT (programme_id, subject_id, curriculum_year) DO NOTHING;
