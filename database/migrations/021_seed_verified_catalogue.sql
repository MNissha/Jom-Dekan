-- =====================================================================
-- Migration 021: Seed verified faculties & programmes from the
-- "Malaysia Public Universities Catalogue v1" (KPT/UPU e-Panduan +
-- official university pages, captured 2026-09-12).
--
-- Only loads what the catalogue actually verified — universities with no
-- published faculty/programme list stay empty rather than being guessed
-- at. UPU admission codes are captured in the new programmes.admission_code
-- column (these identify an *admission* place via UPU, not a course/subject
-- — the catalogue is explicit that they must never be treated as subject
-- codes). Universities with no faculty list but with itemised programmes
-- (UIAM) get a single placeholder faculty so the programme rows have
-- somewhere to attach; it's named so admins can find and re-home them once
-- the real faculty breakdown is captured.
-- =====================================================================
-- Idempotent-safe: faculties/programmes are matched by (parent, name)
-- before insert, and NOT EXISTS guards mean re-running this file is a
-- no-op.

ALTER TABLE programmes
    ADD COLUMN IF NOT EXISTS admission_code VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_programmes_admission_code ON programmes(admission_code);

-- ---------------------------------------------------------------------
-- Faculties / academic units
-- ---------------------------------------------------------------------
INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Academy of Islamic Studies', 'academy-of-islamic-studies'),
    ('Academy of Malay Studies', 'academy-of-malay-studies'),
    ('Faculty of Arts and Social Sciences', 'faculty-of-arts-and-social-sciences'),
    ('Faculty of Built Environment', 'faculty-of-built-environment'),
    ('Faculty of Business and Economics', 'faculty-of-business-and-economics'),
    ('Faculty of Computer Science and Information Technology', 'faculty-of-computer-science-and-information-technology'),
    ('Faculty of Creative Arts', 'faculty-of-creative-arts'),
    ('Faculty of Dentistry', 'faculty-of-dentistry'),
    ('Faculty of Education', 'faculty-of-education'),
    ('Faculty of Engineering', 'faculty-of-engineering'),
    ('Faculty of Languages and Linguistics', 'faculty-of-languages-and-linguistics'),
    ('Faculty of Law', 'faculty-of-law'),
    ('Faculty of Medicine', 'faculty-of-medicine'),
    ('Faculty of Pharmacy', 'faculty-of-pharmacy'),
    ('Faculty of Science', 'faculty-of-science'),
    ('Faculty of Sport and Exercise Sciences', 'faculty-of-sport-and-exercise-sciences')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-malaya'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('PP Bahasa, Literasi & Terjemahan', 'pp-bahasa-literasi-terjemahan'),
    ('PP Ilmu Kemanusiaan', 'pp-ilmu-kemanusiaan'),
    ('PP Ilmu Pendidikan', 'pp-ilmu-pendidikan'),
    ('PP Kejuruteraan Aeroangkasa', 'pp-kejuruteraan-aeroangkasa'),
    ('PP Kejuruteraan Awam', 'pp-kejuruteraan-awam'),
    ('PP Kejuruteraan Bahan & Sumber Mineral', 'pp-kejuruteraan-bahan-sumber-mineral'),
    ('PP Kejuruteraan Elektrik & Elektronik', 'pp-kejuruteraan-elektrik-elektronik'),
    ('PP Kejuruteraan Kimia', 'pp-kejuruteraan-kimia'),
    ('PP Kejuruteraan Mekanik', 'pp-kejuruteraan-mekanik'),
    ('PP Komunikasi', 'pp-komunikasi'),
    ('PP Pengurusan', 'pp-pengurusan'),
    ('PP Perumahan, Bangunan & Perancangan', 'pp-perumahan-bangunan-perancangan'),
    ('PP Sains Farmasi', 'pp-sains-farmasi'),
    ('PP Sains Fizik', 'pp-sains-fizik'),
    ('PP Sains Kajihayat', 'pp-sains-kajihayat'),
    ('PP Sains Kemasyarakatan', 'pp-sains-kemasyarakatan'),
    ('PP Sains Kesihatan', 'pp-sains-kesihatan'),
    ('PP Sains Kimia', 'pp-sains-kimia'),
    ('PP Sains Komputer', 'pp-sains-komputer'),
    ('PP Sains Matematik', 'pp-sains-matematik'),
    ('PP Sains Pergigian', 'pp-sains-pergigian'),
    ('PP Sains Perubatan', 'pp-sains-perubatan'),
    ('PP Seni', 'pp-seni'),
    ('PP Teknologi Industri', 'pp-teknologi-industri')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-sains-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Ekonomi dan Pengurusan', 'fakulti-ekonomi-dan-pengurusan'),
    ('Fakulti Farmasi', 'fakulti-farmasi'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'fakulti-kejuruteraan-dan-alam-bina'),
    ('Fakulti Pendidikan', 'fakulti-pendidikan'),
    ('Fakulti Pengajian Islam', 'fakulti-pengajian-islam'),
    ('Fakulti Pergigian', 'fakulti-pergigian'),
    ('Fakulti Perubatan', 'fakulti-perubatan'),
    ('Fakulti Sains dan Teknologi', 'fakulti-sains-dan-teknologi'),
    ('Fakulti Sains Kesihatan', 'fakulti-sains-kesihatan'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'fakulti-sains-sosial-dan-kemanusiaan'),
    ('Fakulti Teknologi dan Sains Maklumat', 'fakulti-teknologi-dan-sains-maklumat'),
    ('Fakulti Undang-Undang', 'fakulti-undang-undang'),
    ('Pusat Pengajian Citra Universiti', 'pusat-pengajian-citra-universiti')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-kebangsaan-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Bahasa Moden dan Komunikasi', 'fakulti-bahasa-moden-dan-komunikasi'),
    ('Fakulti Bioteknologi dan Sains Biomolekul', 'fakulti-bioteknologi-dan-sains-biomolekul'),
    ('Fakulti Kejuruteraan', 'fakulti-kejuruteraan'),
    ('Fakulti Kemanusiaan, Pengurusan dan Sains (Kampus Bintulu, Sarawak)', 'fakulti-kemanusiaan-pengurusan-dan-sains-kampus-bintulu-sarawak'),
    ('Fakulti Pengajian Pendidikan', 'fakulti-pengajian-pendidikan'),
    ('Fakulti Perhutanan dan Alam Sekitar', 'fakulti-perhutanan-dan-alam-sekitar'),
    ('Fakulti Pertanian', 'fakulti-pertanian'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'fakulti-perubatan-dan-sains-kesihatan'),
    ('Fakulti Perubatan Veterinar', 'fakulti-perubatan-veterinar'),
    ('Fakulti Rekabentuk dan Senibina', 'fakulti-rekabentuk-dan-senibina'),
    ('Fakulti Sains', 'fakulti-sains'),
    ('Fakulti Sains dan Teknologi Makanan', 'fakulti-sains-dan-teknologi-makanan'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'fakulti-sains-komputer-dan-teknologi-maklumat'),
    ('Fakulti Sains Pertanian dan Perhutanan (Kampus Bintulu, Sarawak)', 'fakulti-sains-pertanian-dan-perhutanan-kampus-bintulu-sarawak'),
    ('Sekolah Perniagaan dan Ekonomi', 'sekolah-perniagaan-dan-ekonomi')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-putra-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Alam Bina dan Ukur (FABU)', 'fakulti-alam-bina-dan-ukur-fabu'),
    ('Fakulti Kecerdasan Buatan (FAI)', 'fakulti-kecerdasan-buatan-fai'),
    ('Fakulti Kejuruteraan Awam (FKA)', 'fakulti-kejuruteraan-awam-fka'),
    ('Fakulti Kejuruteraan Elektrik (FKE)', 'fakulti-kejuruteraan-elektrik-fke'),
    ('Fakulti Kejuruteraan Kimia dan Kejuruteraan Tenaga (FKT)', 'fakulti-kejuruteraan-kimia-dan-kejuruteraan-tenaga-fkt'),
    ('Fakulti Kejuruteraan Mekanikal (FKM)', 'fakulti-kejuruteraan-mekanikal-fkm'),
    ('Fakulti Komputeran (FC)', 'fakulti-komputeran-fc'),
    ('Fakulti Pengurusan (FM)', 'fakulti-pengurusan-fm'),
    ('Fakulti Sains (FS)', 'fakulti-sains-fs'),
    ('Fakulti Sains Pendidikan dan Teknologi (FEST)', 'fakulti-sains-pendidikan-dan-teknologi-fest'),
    ('Fakulti Sains Sosial dan Kemanusiaan (FSSH)', 'fakulti-sains-sosial-dan-kemanusiaan-fssh'),
    ('Sekolah Pembangunan Sumber Manusia dan Psikologi (SPSMP)', 'sekolah-pembangunan-sumber-manusia-dan-psikologi-spsmp')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-teknologi-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Alam Bina', 'fakulti-alam-bina'),
    ('Fakulti Bahasa dan Komunikasi', 'fakulti-bahasa-dan-komunikasi'),
    ('Fakulti Ekonomi dan Perniagaan', 'fakulti-ekonomi-dan-perniagaan'),
    ('Fakulti Kejuruteraan', 'fakulti-kejuruteraan'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'fakulti-perubatan-dan-sains-kesihatan'),
    ('Fakulti Sains dan Teknologi Sumber', 'fakulti-sains-dan-teknologi-sumber'),
    ('Fakulti Sains Kognitif dan Pembangunan Manusia', 'fakulti-sains-kognitif-dan-pembangunan-manusia'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'fakulti-sains-komputer-dan-teknologi-maklumat'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'fakulti-sains-sosial-dan-kemanusiaan'),
    ('Fakulti Seni Gunaan dan Kreatif', 'fakulti-seni-gunaan-dan-kreatif'),
    ('Pusat Pengajian Prasiswazah', 'pusat-pengajian-prasiswazah')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-malaysia-sarawak'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Ekonomi dan Muamalat', 'fakulti-ekonomi-dan-muamalat'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'fakulti-kejuruteraan-dan-alam-bina'),
    ('Fakulti Kepimpinan dan Pengurusan', 'fakulti-kepimpinan-dan-pengurusan'),
    ('Fakulti Pengajian Bahasa Utama', 'fakulti-pengajian-bahasa-utama'),
    ('Fakulti Pengajian Quran dan Sunnah', 'fakulti-pengajian-quran-dan-sunnah'),
    ('Fakulti Pergigian', 'fakulti-pergigian'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'fakulti-perubatan-dan-sains-kesihatan'),
    ('Fakulti Sains dan Teknologi', 'fakulti-sains-dan-teknologi'),
    ('Fakulti Syariah dan Undang-undang', 'fakulti-syariah-dan-undang-undang')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-sains-islam-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Akademi Pengajian Bahasa', 'akademi-pengajian-bahasa'),
    ('Akademi Pengajian Islam Kontemporari', 'akademi-pengajian-islam-kontemporari'),
    ('Fakulti Farmasi', 'fakulti-farmasi'),
    ('Fakulti Komunikasi dan Pengajian Media', 'fakulti-komunikasi-dan-pengajian-media'),
    ('Fakulti Pendidikan', 'fakulti-pendidikan'),
    ('Fakulti Pengurusan Hotel dan Perlancongan', 'fakulti-pengurusan-hotel-dan-perlancongan'),
    ('Fakulti Pengurusan Maklumat', 'fakulti-pengurusan-maklumat'),
    ('Fakulti Pengurusan Perniagaan', 'fakulti-pengurusan-perniagaan'),
    ('Fakulti Perakaunan', 'fakulti-perakaunan'),
    ('Fakulti Pergigian', 'fakulti-pergigian'),
    ('Fakulti Perladangan dan Agroteknologi', 'fakulti-perladangan-dan-agroteknologi'),
    ('Fakulti Perubatan', 'fakulti-perubatan'),
    ('Fakulti Sains Gunaan', 'fakulti-sains-gunaan'),
    ('Fakulti Sains Kesihatan', 'fakulti-sains-kesihatan'),
    ('Fakulti Sains Komputer dan Matematik', 'fakulti-sains-komputer-dan-matematik'),
    ('Fakulti Sains Pentadbiran dan Pengajian Polisi', 'fakulti-sains-pentadbiran-dan-pengajian-polisi'),
    ('Fakulti Sains Sukan dan Rekreasi', 'fakulti-sains-sukan-dan-rekreasi'),
    ('Fakulti Senibina, Perancangan dan Ukur', 'fakulti-senibina-perancangan-dan-ukur'),
    ('Fakulti Undang-Undang', 'fakulti-undang-undang'),
    ('Kolej Pengajian Kejuruteraan', 'kolej-pengajian-kejuruteraan'),
    ('Kolej Pengajian Seni Kreatif', 'kolej-pengajian-seni-kreatif')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-teknologi-mara'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Bahasa dan Komunikasi', 'fakulti-bahasa-dan-komunikasi'),
    ('Fakulti Biosumber dan Industri Makanan', 'fakulti-biosumber-dan-industri-makanan'),
    ('Fakulti Farmasi', 'fakulti-farmasi'),
    ('Fakulti Informatik dan Komputeran', 'fakulti-informatik-dan-komputeran'),
    ('Fakulti Pengajian Kontemporari Islam', 'fakulti-pengajian-kontemporari-islam'),
    ('Fakulti Perniagaan dan Pengurusan', 'fakulti-perniagaan-dan-pengurusan'),
    ('Fakulti Perubatan', 'fakulti-perubatan'),
    ('Fakulti Reka Bentuk Inovatif dan Teknologi', 'fakulti-reka-bentuk-inovatif-dan-teknologi'),
    ('Fakulti Sains Kesihatan', 'fakulti-sains-kesihatan'),
    ('Fakulti Sains Sosial Gunaan', 'fakulti-sains-sosial-gunaan'),
    ('Fakulti Undang-Undang dan Hubungan Antarabangsa', 'fakulti-undang-undang-dan-hubungan-antarabangsa')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-sultan-zainal-abidin'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Akademi Golf Nasional UUM', 'akademi-golf-nasional-uum'),
    ('Kolej Pengajian', 'kolej-pengajian')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-utara-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Pengajian Maritim (FPM)', 'fakulti-pengajian-maritim-fpm'),
    ('Fakulti Perniagaan, Ekonomi Dan Pembangunan Sosial (FPEPS)', 'fakulti-perniagaan-ekonomi-dan-pembangunan-sosial-fpeps'),
    ('Fakulti Sains Dan Sekitaran Marin (FSSM)', 'fakulti-sains-dan-sekitaran-marin-fssm'),
    ('Fakulti Sains Komputer dan Matematik (FSKM)', 'fakulti-sains-komputer-dan-matematik-fskm'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'fakulti-sains-makanan-dan-agroteknologi-fsma'),
    ('Fakulti Sains Perikanan Dan Akuakultur (FSPA)', 'fakulti-sains-perikanan-dan-akuakultur-fspa'),
    ('Fakulti Teknologi Kejuruteraan Kelautan (FTKK)', 'fakulti-teknologi-kejuruteraan-kelautan-ftkk')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-malaysia-terengganu'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Biokejuruteraan Dan Teknologi (FBKT)', 'fakulti-biokejuruteraan-dan-teknologi-fbkt'),
    ('Fakulti Hospitaliti, Pelancongan dan Kesejahteraan (FHPK)', 'fakulti-hospitaliti-pelancongan-dan-kesejahteraan-fhpk'),
    ('Fakulti Industri Asas Tani (FIAT)', 'fakulti-industri-asas-tani-fiat'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'fakulti-keusahawanan-perniagaan-fkp'),
    ('Fakulti Pengajian Bahasa dan Pembangunan Insan (FBI)', 'fakulti-pengajian-bahasa-dan-pembangunan-insan-fbi'),
    ('Fakulti Perubatan Veterinar (FPV)', 'fakulti-perubatan-veterinar-fpv'),
    ('Fakulti Sains Bumi (FSB)', 'fakulti-sains-bumi-fsb'),
    ('Fakulti Sains Data dan Komputeran (FSDK)', 'fakulti-sains-data-dan-komputeran-fsdk'),
    ('Fakulti Senibina dan Ekistik (FSE)', 'fakulti-senibina-dan-ekistik-fse'),
    ('Fakulti Teknologi Kreatif & Warisan (FTKW)', 'fakulti-teknologi-kreatif-warisan-ftkw')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-malaysia-kelantan'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Kejuruteraan Awam dan Alam Bina', 'fakulti-kejuruteraan-awam-dan-alam-bina'),
    ('Fakulti Kejuruteraan Elektrik dan Elektronik', 'fakulti-kejuruteraan-elektrik-dan-elektronik'),
    ('Fakulti Kejuruteraan Mekanikal dan Pembuatan', 'fakulti-kejuruteraan-mekanikal-dan-pembuatan'),
    ('Fakulti Pendidikan Teknikal dan Vokasional', 'fakulti-pendidikan-teknikal-dan-vokasional'),
    ('Fakulti Pengurusan Teknologi dan Perniagaan', 'fakulti-pengurusan-teknologi-dan-perniagaan'),
    ('Fakulti Sains Gunaan dan Teknologi', 'fakulti-sains-gunaan-dan-teknologi'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'fakulti-sains-komputer-dan-teknologi-maklumat'),
    ('Fakulti Teknologi Kejuruteraan', 'fakulti-teknologi-kejuruteraan'),
    ('Pusat Pengajian Diploma', 'pusat-pengajian-diploma')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-tun-hussein-onn-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

INSERT INTO faculties (university_id, name, slug)
SELECT u.id, f.name, f.slug
FROM universities u
JOIN (VALUES
    ('Fakulti Kejuruteraan Elektrik (FKE)', 'fakulti-kejuruteraan-elektrik-fke'),
    ('Fakulti Kejuruteraan Elektronik dan Kejuruteraan Komputer (FKEKK)', 'fakulti-kejuruteraan-elektronik-dan-kejuruteraan-komputer-fkekk'),
    ('Fakulti Kejuruteraan Mekanikal (FKM)', 'fakulti-kejuruteraan-mekanikal-fkm'),
    ('Fakulti Kejuruteraan Pembuatan (FKP)', 'fakulti-kejuruteraan-pembuatan-fkp'),
    ('Fakulti Pengurusan Teknologi dan Teknousahawanan (FPTT)', 'fakulti-pengurusan-teknologi-dan-teknousahawanan-fptt'),
    ('Fakulti Teknologi Kejuruteraan Elektrik dan Elektronik (FTKEE)', 'fakulti-teknologi-kejuruteraan-elektrik-dan-elektronik-ftkee'),
    ('Fakulti Teknologi Kejuruteraan Mekanikal dan Pembuatan (FTKMP)', 'fakulti-teknologi-kejuruteraan-mekanikal-dan-pembuatan-ftkmp'),
    ('Fakulti Teknologi Maklumat dan Komunikasi (FTMK)', 'fakulti-teknologi-maklumat-dan-komunikasi-ftmk')
) AS f(name, slug) ON true
WHERE u.slug = 'universiti-teknikal-malaysia-melaka'
ON CONFLICT (university_id, slug) DO NOTHING;

-- Placeholder faculty for universities whose catalogue page didn't publish a faculty breakdown
INSERT INTO faculties (university_id, name, slug)
SELECT u.id, 'Not Publicly Itemised (Pending Verification)', 'not-publicly-itemised-pending-verification'
FROM universities u
WHERE u.slug = 'universiti-islam-antarabangsa-malaysia'
ON CONFLICT (university_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- Programmes (name, UPU admission_code, study_level)
-- "Professional degree" entries (Doktor Perubatan etc.) are stored as
-- DEGREE — same 4-value study_level set the admin UI already offers, and
-- these are UPU-admitted at first-degree level alongside the Bachelors.
-- ---------------------------------------------------------------------
INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Fakulti Ekonomi dan Pengurusan', 'Sarjana Muda Ekonomi dengan Kepujian', 'sarjana-muda-ekonomi-dengan-kepujian', 'DEGREE', 'UK6314001'),
    ('Fakulti Ekonomi dan Pengurusan', 'Sarjana Muda Keusahawanan dan Inovasi dengan Kepujian', 'sarjana-muda-keusahawanan-dan-inovasi-dengan-kepujian', 'DEGREE', 'UK6342001'),
    ('Fakulti Ekonomi dan Pengurusan', 'Sarjana Muda Pentadbiran Perniagaan dengan Kepujian', 'sarjana-muda-pentadbiran-perniagaan-dengan-kepujian', 'DEGREE', 'UK6345002'),
    ('Fakulti Ekonomi dan Pengurusan', 'Sarjana Muda Perakaunan dengan Kepujian', 'sarjana-muda-perakaunan-dengan-kepujian', 'DEGREE', 'UK6344001'),
    ('Fakulti Farmasi', 'Sarjana Muda Farmasi dengan Kepujian', 'sarjana-muda-farmasi-dengan-kepujian', 'DEGREE', 'UK6727001'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'Sarjana Muda Kejuruteraan Mekanikal dengan Kepujian', 'sarjana-muda-kejuruteraan-mekanikal-dengan-kepujian', 'DEGREE', 'UK6521001'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'Sarjana Muda Kejuruteraan Elektrik & Elektronik dengan Kepujian', 'sarjana-muda-kejuruteraan-elektrik-elektronik-dengan-kepujian', 'DEGREE', 'UK6523001'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'Sarjana Muda Kejuruteraan Kimia dengan Kepujian', 'sarjana-muda-kejuruteraan-kimia-dengan-kepujian', 'DEGREE', 'UK6524001'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'Sarjana Muda Kejuruteraan Awam dengan Kepujian', 'sarjana-muda-kejuruteraan-awam-dengan-kepujian', 'DEGREE', 'UK6526001'),
    ('Fakulti Kejuruteraan dan Alam Bina', 'Sarjana Muda Sains Seni Bina dengan Kepujian', 'sarjana-muda-sains-seni-bina-dengan-kepujian', 'DEGREE', 'UK6581001'),
    ('Fakulti Pendidikan', 'Sarjana Muda Pendidikan dengan Kepujian dalam Pengajaran Bahasa Inggeris Sebagai Bahasa Kedua', 'sarjana-muda-pendidikan-dengan-kepujian-dalam-pengajaran-bahasa-inggeris-sebagai-bahasa-kedua', 'DEGREE', 'UK6145001'),
    ('Fakulti Pendidikan', 'Ijazah Sarjana Muda Pendidikan dengan Kepujian (Pendidikan Khas)', 'ijazah-sarjana-muda-pendidikan-dengan-kepujian-pendidikan-khas', 'DEGREE', 'UK6145002'),
    ('Fakulti Pendidikan', 'Sarjana Muda Pendidikan dengan Kepujian dalam Pendidikan Jasmani dan Kesihatan', 'sarjana-muda-pendidikan-dengan-kepujian-dalam-pendidikan-jasmani-dan-kesihatan', 'DEGREE', 'UK6145003'),
    ('Fakulti Pergigian', 'Ijazah Doktor Pergigian', 'ijazah-doktor-pergigian', 'DEGREE', 'UK6724001'),
    ('Fakulti Perubatan', 'Ijazah Doktor Perubatan', 'ijazah-doktor-perubatan', 'DEGREE', 'UK6721001'),
    ('Fakulti Perubatan', 'Ijazah Sarjana Muda Kejururawaran dengan Kepujian', 'ijazah-sarjana-muda-kejururawaran-dengan-kepujian', 'DEGREE', 'UK6723001'),
    ('Fakulti Perubatan', 'Sarjana Muda Sains Perubatan Kecemasan dengan Kepujian', 'sarjana-muda-sains-perubatan-kecemasan-dengan-kepujian', 'DEGREE', 'UK6725005'),
    ('Fakulti Pengajian Islam', 'Sarjana Muda Pengajian Islam dengan Kepujian (Usuluddin dan Falsafah)', 'sarjana-muda-pengajian-islam-dengan-kepujian-usuluddin-dan-falsafah', 'DEGREE', 'UK6221001'),
    ('Fakulti Pengajian Islam', 'Sarjana Muda Pengajian Islam dengan Kepujian (Syariah)', 'sarjana-muda-pengajian-islam-dengan-kepujian-syariah', 'DEGREE', 'UK6221002'),
    ('Fakulti Pengajian Islam', 'Sarjana Muda Pengajian Islam dengan Kepujian (Pengajian Arab dan Tamadun Islam)', 'sarjana-muda-pengajian-islam-dengan-kepujian-pengajian-arab-dan-tamadun-islam', 'DEGREE', 'UK6221003'),
    ('Fakulti Pengajian Islam', 'Sarjana Muda Pengajian Islam dengan Kepujian (Pengajian Dakwah dan Kepimpinan)', 'sarjana-muda-pengajian-islam-dengan-kepujian-pengajian-dakwah-dan-kepimpinan', 'DEGREE', 'UK6221004'),
    ('Fakulti Pengajian Islam', 'Sarjana Muda Pengajian Islam dengan Kepujian (Pengajian Al-Quran dan Al-Sunnah)', 'sarjana-muda-pengajian-islam-dengan-kepujian-pengajian-al-quran-dan-al-sunnah', 'DEGREE', 'UK6221005'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Biologi)', 'sarjana-muda-sains-dengan-kepujian-biologi', 'DEGREE', 'UK6421001'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Biokimia)', 'sarjana-muda-sains-dengan-kepujian-biokimia', 'DEGREE', 'UK6421002'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Mikrobiologi)', 'sarjana-muda-sains-dengan-kepujian-mikrobiologi', 'DEGREE', 'UK6421003'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Bioinformatik)', 'sarjana-muda-sains-dengan-kepujian-bioinformatik', 'DEGREE', 'UK6421004'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Genetik)', 'sarjana-muda-sains-dengan-kepujian-genetik', 'DEGREE', 'UK6421005'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Bioteknologi Tumbuhan)', 'sarjana-muda-sains-dengan-kepujian-bioteknologi-tumbuhan', 'DEGREE', 'UK6421006'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Sains Sekitaran)', 'sarjana-muda-sains-dengan-kepujian-sains-sekitaran', 'DEGREE', 'UK6422001'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains Fizik dengan Kepujian', 'sarjana-muda-sains-fizik-dengan-kepujian', 'DEGREE', 'UK6441001'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains Nuklear dengan Kepujian', 'sarjana-muda-sains-nuklear-dengan-kepujian', 'DEGREE', 'UK6441004'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Teknologi Kimia)', 'sarjana-muda-sains-dengan-kepujian-teknologi-kimia', 'DEGREE', 'UK6442001'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Kimia)', 'sarjana-muda-sains-dengan-kepujian-kimia', 'DEGREE', 'UK6442002'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Sains Laut)', 'sarjana-muda-sains-dengan-kepujian-sains-laut', 'DEGREE', 'UK6443002'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Geologi)', 'sarjana-muda-sains-dengan-kepujian-geologi', 'DEGREE', 'UK6443003'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Matematik)', 'sarjana-muda-sains-dengan-kepujian-matematik', 'DEGREE', 'UK6461001'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dalam Statistik dengan Kepujian', 'sarjana-muda-sains-dalam-statistik-dengan-kepujian', 'DEGREE', 'UK6462001'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Sains Aktuari)', 'sarjana-muda-sains-dengan-kepujian-sains-aktuari', 'DEGREE', 'UK6462002'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dan Teknologi Makanan dengan Kepujian', 'sarjana-muda-sains-dan-teknologi-makanan-dengan-kepujian', 'DEGREE', 'UK6541002'),
    ('Fakulti Sains dan Teknologi', 'Sarjana Muda Sains dengan Kepujian (Sains Bahan)', 'sarjana-muda-sains-dengan-kepujian-sains-bahan', 'DEGREE', 'UK6545003'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Pengimejan Diagnostik dan Radioterapi dengan Kepujian', 'sarjana-muda-pengimejan-diagnostik-dan-radioterapi-dengan-kepujian', 'DEGREE', 'UK6725001'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Sains Forensik dengan Kepujian', 'sarjana-muda-sains-forensik-dengan-kepujian', 'DEGREE', 'UK6725002'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Audiologi dengan Kepujian', 'sarjana-muda-audiologi-dengan-kepujian', 'DEGREE', 'UK6725003'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Sains Bioperubatan dengan Kepujian', 'sarjana-muda-sains-bioperubatan-dengan-kepujian', 'DEGREE', 'UK6725004'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Optometri dengan Kepujian', 'sarjana-muda-optometri-dengan-kepujian', 'DEGREE', 'UK6726001'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Dietetik dengan Kepujian', 'sarjana-muda-dietetik-dengan-kepujian', 'DEGREE', 'UK6726002'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Fisioterapi dengan Kepujian', 'sarjana-muda-fisioterapi-dengan-kepujian', 'DEGREE', 'UK6726003'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Terapi Carakerja dengan Kepujian', 'sarjana-muda-terapi-carakerja-dengan-kepujian', 'DEGREE', 'UK6726004'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Sains Pertuturan dengan Kepujian', 'sarjana-muda-sains-pertuturan-dengan-kepujian', 'DEGREE', 'UK6726005'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Sains Pemakanan dengan Kepujian', 'sarjana-muda-sains-pemakanan-dengan-kepujian', 'DEGREE', 'UK6726006'),
    ('Fakulti Sains Kesihatan', 'Sarjana Muda Kesihatan Persekitaran dan Pekerjaan dengan Kepujian', 'sarjana-muda-kesihatan-persekitaran-dan-pekerjaan-dengan-kepujian', 'DEGREE', 'UK6851001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Linguistik dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-linguistik-dengan-kepujian', 'DEGREE', 'UK6222001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sastera dalam Pengajian Bahasa Melayu dengan Kepujian', 'sarjana-muda-sastera-dalam-pengajian-bahasa-melayu-dengan-kepujian', 'DEGREE', 'UK6223002'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sastera dalam Pengajian Bahasa Inggeris dengan Kepujian', 'sarjana-muda-sastera-dalam-pengajian-bahasa-inggeris-dengan-kepujian', 'DEGREE', 'UK6224001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sastera dalam Sejarah dengan Kepujian', 'sarjana-muda-sastera-dalam-sejarah-dengan-kepujian', 'DEGREE', 'UK6225001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Psikologi dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-psikologi-dengan-kepujian', 'DEGREE', 'UK6311001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Antropologi & Sosiologi dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-antropologi-sosiologi-dengan-kepujian', 'DEGREE', 'UK6312001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sastera dalam Persuratan dan Kebudayaan Melayu dengan Kepujian', 'sarjana-muda-sastera-dalam-persuratan-dan-kebudayaan-melayu-dengan-kepujian', 'DEGREE', 'UK6312002'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Sains Pembangunan dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-sains-pembangunan-dengan-kepujian', 'DEGREE', 'UK6312003'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Geografi dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-geografi-dengan-kepujian', 'DEGREE', 'UK6312004'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Sains Politik dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-sains-politik-dengan-kepujian', 'DEGREE', 'UK6313001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Komunikasi Media dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-komunikasi-media-dengan-kepujian', 'DEGREE', 'UK6321001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Kerja Sosial dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-kerja-sosial-dengan-kepujian', 'DEGREE', 'UK6762001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Kriminologi dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-kriminologi-dengan-kepujian', 'DEGREE', 'UK6310001'),
    ('Fakulti Sains Sosial dan Kemanusiaan', 'Sarjana Muda Sains Sosial dalam Pengurusan Keselamatan dan Persekitaran Pekerjaan dengan Kepujian', 'sarjana-muda-sains-sosial-dalam-pengurusan-keselamatan-dan-persekitaran-pekerjaan-dengan-kepujian', 'DEGREE', 'UK6862001'),
    ('Fakulti Teknologi dan Sains Maklumat', 'Sarjana Muda Sains Komputer dengan Kepujian', 'sarjana-muda-sains-komputer-dengan-kepujian', 'DEGREE', 'UK6481001'),
    ('Fakulti Teknologi dan Sains Maklumat', 'Sarjana Muda Teknologi Maklumat dengan Kepujian', 'sarjana-muda-teknologi-maklumat-dengan-kepujian', 'DEGREE', 'UK6481002'),
    ('Fakulti Teknologi dan Sains Maklumat', 'Sarjana Muda Kejuruteraan Perisian dengan Kepujian', 'sarjana-muda-kejuruteraan-perisian-dengan-kepujian', 'DEGREE', 'UK6481005'),
    ('Fakulti Undang-Undang', 'Sarjana Muda Undang-Undang dengan Kepujian', 'sarjana-muda-undang-undang-dengan-kepujian', 'DEGREE', 'UK6380001'),
    ('Pusat Pengajian Citra Universiti', 'Sarjana Muda Sains Citra dengan Kepujian', 'sarjana-muda-sains-citra-dengan-kepujian', 'DEGREE', 'UK6220001')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-kebangsaan-malaysia'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Fakulti Pertanian', 'Bacelor Sains Pertanian dengan Kepujian', 'bacelor-sains-pertanian-dengan-kepujian', 'DEGREE', 'UP6621001'),
    ('Fakulti Pertanian', 'Bacelor Sains Pengurusan Perladangan dengan Kepujian', 'bacelor-sains-pengurusan-perladangan-dengan-kepujian', 'DEGREE', 'UP6621002'),
    ('Fakulti Pertanian', 'Bacelor Pertanian Sains Ternakan dengan Kepujian', 'bacelor-pertanian-sains-ternakan-dengan-kepujian', 'DEGREE', 'UP6621004'),
    ('Fakulti Pertanian', 'Bacelor Sains Perniagaantani dengan Kepujian', 'bacelor-sains-perniagaantani-dengan-kepujian', 'DEGREE', 'UP6621005'),
    ('Fakulti Pertanian', 'Bacelor Sains Hortikultur dengan Kepujian', 'bacelor-sains-hortikultur-dengan-kepujian', 'DEGREE', 'UP6622001'),
    ('Fakulti Pertanian', 'Bacelor Sains Akuakultur dengan Kepujian', 'bacelor-sains-akuakultur-dengan-kepujian', 'DEGREE', 'UP6624001'),
    ('Fakulti Perhutanan dan Alam Sekitar', 'Bacelor Pengurusan Alam Sekitar dengan Kepujian', 'bacelor-pengurusan-alam-sekitar-dengan-kepujian', 'DEGREE', 'UP6345007'),
    ('Fakulti Perhutanan dan Alam Sekitar', 'Bacelor Sains dan Teknologi Alam Sekitar dengan Kepujian', 'bacelor-sains-dan-teknologi-alam-sekitar-dengan-kepujian', 'DEGREE', 'UP6422001'),
    ('Fakulti Perhutanan dan Alam Sekitar', 'Bacelor Sains Perhutanan dengan Kepujian (Kampus Serdang)', 'bacelor-sains-perhutanan-dengan-kepujian-kampus-serdang', 'DEGREE', 'UP6623001'),
    ('Fakulti Perhutanan dan Alam Sekitar', 'Bacelor Sains dan Teknologi Kayu dengan Kepujian', 'bacelor-sains-dan-teknologi-kayu-dengan-kepujian', 'DEGREE', 'UP6623003'),
    ('Fakulti Perhutanan dan Alam Sekitar', 'Bacelor Sains Taman dan Rekreasi dengan Kepujian', 'bacelor-sains-taman-dan-rekreasi-dengan-kepujian', 'DEGREE', 'UP6812001'),
    ('Fakulti Perubatan Veterinar', 'Doktor Perubatan Veterinar', 'doktor-perubatan-veterinar', 'DEGREE', 'UP6640001'),
    ('Sekolah Perniagaan dan Ekonomi', 'Bacelor Ekonomi dengan Kepujian', 'bacelor-ekonomi-dengan-kepujian', 'DEGREE', 'UP6314001'),
    ('Sekolah Perniagaan dan Ekonomi', 'Bacelor Perakaunan (Kepujian)', 'bacelor-perakaunan-kepujian', 'DEGREE', 'UP6344001'),
    ('Sekolah Perniagaan dan Ekonomi', 'Bacelor Pentadbiran Perniagaan dengan Kepujian', 'bacelor-pentadbiran-perniagaan-dengan-kepujian', 'DEGREE', 'UP6345001'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Mekanikal dengan Kepujian', 'bacelor-kejuruteraan-mekanikal-dengan-kepujian', 'DEGREE', 'UP6521001'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Elektrik dan Elektronik dengan Kepujian', 'bacelor-kejuruteraan-elektrik-dan-elektronik-dengan-kepujian', 'DEGREE', 'UP6523001'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Sistem Komputer dan Komunikasi dengan Kepujian', 'bacelor-kejuruteraan-sistem-komputer-dan-komunikasi-dengan-kepujian', 'DEGREE', 'UP6523002'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Kimia dengan Kepujian', 'bacelor-kejuruteraan-kimia-dengan-kepujian', 'DEGREE', 'UP6524001'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Pertanian dan Biosistem dengan Kepujian', 'bacelor-kejuruteraan-pertanian-dan-biosistem-dengan-kepujian', 'DEGREE', 'UP6524002'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Aeroangkasa dengan Kepujian', 'bacelor-kejuruteraan-aeroangkasa-dengan-kepujian', 'DEGREE', 'UP6525001'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Awam dengan Kepujian', 'bacelor-kejuruteraan-awam-dengan-kepujian', 'DEGREE', 'UP6526001'),
    ('Fakulti Kejuruteraan', 'Bacelor Kejuruteraan Proses dan Makanan dengan Kepujian', 'bacelor-kejuruteraan-proses-dan-makanan-dengan-kepujian', 'DEGREE', 'UP6541004'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Pendidikan dalam Pendidikan Jasmani dengan Kepujian', 'bacelor-pendidikan-dalam-pendidikan-jasmani-dengan-kepujian', 'DEGREE', 'UP6145001'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Pendidikan Bimbingan dan Kaunseling dengan Kepujian', 'bacelor-pendidikan-bimbingan-dan-kaunseling-dengan-kepujian', 'DEGREE', 'UP6145002'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Pendidikan Bahasa Melayu dengan Kepujian', 'bacelor-pendidikan-bahasa-melayu-dengan-kepujian', 'DEGREE', 'UP6145003'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Pendidikan Pengajaran Bahasa Inggeris Sebagai Bahasa Kedua dengan Kepujian', 'bacelor-pendidikan-pengajaran-bahasa-inggeris-sebagai-bahasa-kedua-dengan-kepujian', 'DEGREE', 'UP6145004'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Pendidikan Sains Rumah Tangga dengan Kepujian', 'bacelor-pendidikan-sains-rumah-tangga-dengan-kepujian', 'DEGREE', 'UP6145005'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Pendidikan Sains Pertanian dengan Kepujian', 'bacelor-pendidikan-sains-pertanian-dengan-kepujian', 'DEGREE', 'UP6145006'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Sains Pembangunan Sumber Manusia dengan Kepujian', 'bacelor-sains-pembangunan-sumber-manusia-dengan-kepujian', 'DEGREE', 'UP6345002'),
    ('Fakulti Pengajian Pendidikan', 'Bacelor Kaunseling dengan Kepujian', 'bacelor-kaunseling-dengan-kepujian', 'DEGREE', 'UP6762001'),
    ('Fakulti Sains', 'Bacelor Sains Biologi dengan Pendidikan (Kepujian)', 'bacelor-sains-biologi-dengan-pendidikan-kepujian', 'DEGREE', 'UP6142001'),
    ('Fakulti Sains', 'Bacelor Sains Fizik dengan Pendidikan (Kepujian)', 'bacelor-sains-fizik-dengan-pendidikan-kepujian', 'DEGREE', 'UP6142002'),
    ('Fakulti Sains', 'Bacelor Sains Kimia dengan Pendidikan (Kepujian)', 'bacelor-sains-kimia-dengan-pendidikan-kepujian', 'DEGREE', 'UP6142003'),
    ('Fakulti Sains', 'Bacelor Sains Matematik dengan Pendidikan (Kepujian)', 'bacelor-sains-matematik-dengan-pendidikan-kepujian', 'DEGREE', 'UP6142004'),
    ('Fakulti Sains', 'Bacelor Sains Biologi dengan Kepujian', 'bacelor-sains-biologi-dengan-kepujian', 'DEGREE', 'UP6421002'),
    ('Fakulti Sains', 'Bacelor Sains dalam Sains Bahan dengan Kepujian', 'bacelor-sains-dalam-sains-bahan-dengan-kepujian', 'DEGREE', 'UP6440001'),
    ('Fakulti Sains', 'Bacelor Sains dalam Sains Instrumentasi dengan Kepujian', 'bacelor-sains-dalam-sains-instrumentasi-dengan-kepujian', 'DEGREE', 'UP6440002'),
    ('Fakulti Sains', 'Bacelor Sains Fizik dengan Kepujian', 'bacelor-sains-fizik-dengan-kepujian', 'DEGREE', 'UP6441001'),
    ('Fakulti Sains', 'Bacelor Sains Kimia dengan Kepujian', 'bacelor-sains-kimia-dengan-kepujian', 'DEGREE', 'UP6442001'),
    ('Fakulti Sains', 'Bacelor Sains Kimia Perindustrian dengan Kepujian', 'bacelor-sains-kimia-perindustrian-dengan-kepujian', 'DEGREE', 'UP6442002'),
    ('Fakulti Sains', 'Bacelor Sains Kimia Petroleum dengan Kepujian', 'bacelor-sains-kimia-petroleum-dengan-kepujian', 'DEGREE', 'UP6442003'),
    ('Fakulti Sains', 'Bacelor Sains Matematik dengan Kepujian', 'bacelor-sains-matematik-dengan-kepujian', 'DEGREE', 'UP6461001'),
    ('Fakulti Sains', 'Bacelor Sains Statistik dengan Kepujian', 'bacelor-sains-statistik-dengan-kepujian', 'DEGREE', 'UP6462001'),
    ('Fakulti Sains dan Teknologi Makanan', 'Bacelor Sains dan Teknologi Makanan dengan Kepujian', 'bacelor-sains-dan-teknologi-makanan-dengan-kepujian', 'DEGREE', 'UP6541001'),
    ('Fakulti Sains dan Teknologi Makanan', 'Bacelor Sains Pengajian Makanan dengan Kepujian', 'bacelor-sains-pengajian-makanan-dengan-kepujian', 'DEGREE', 'UP6541002'),
    ('Fakulti Sains dan Teknologi Makanan', 'Bacelor Sains Pengurusan Perkhidmatan Makanan dengan Kepujian', 'bacelor-sains-pengurusan-perkhidmatan-makanan-dengan-kepujian', 'DEGREE', 'UP6541003'),
    ('Fakulti Sains dan Teknologi Makanan', 'Bacelor Sains Operasi Pembuatan Makanan dengan Kepujian', 'bacelor-sains-operasi-pembuatan-makanan-dengan-kepujian', 'DEGREE', 'UP6541005'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Bahasa dan Linguistik Melayu dengan Kepujian', 'bacelor-sastera-bahasa-dan-linguistik-melayu-dengan-kepujian', 'DEGREE', 'UP6222001'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Kesusasteraan Melayu dengan Kepujian', 'bacelor-sastera-kesusasteraan-melayu-dengan-kepujian', 'DEGREE', 'UP6223001'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Bahasa dan Linguistik Inggeris dengan Kepujian', 'bacelor-sastera-bahasa-dan-linguistik-inggeris-dengan-kepujian', 'DEGREE', 'UP6224001'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Pengajian Bahasa Cina dengan Kepujian', 'bacelor-sastera-pengajian-bahasa-cina-dengan-kepujian', 'DEGREE', 'UP6224002'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Bahasa Arab dengan Kepujian', 'bacelor-sastera-bahasa-arab-dengan-kepujian', 'DEGREE', 'UP6224003'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Kesusasteraan Inggeris dengan Kepujian', 'bacelor-sastera-kesusasteraan-inggeris-dengan-kepujian', 'DEGREE', 'UP6224004'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Pengajian Bahasa Perancis dengan Kepujian', 'bacelor-sastera-pengajian-bahasa-perancis-dengan-kepujian', 'DEGREE', 'UP6224005'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Sastera Pengajian Bahasa Jerman dengan Kepujian', 'bacelor-sastera-pengajian-bahasa-jerman-dengan-kepujian', 'DEGREE', 'UP6224006'),
    ('Fakulti Bahasa Moden dan Komunikasi', 'Bacelor Komunikasi dengan Kepujian', 'bacelor-komunikasi-dengan-kepujian', 'DEGREE', 'UP6321001'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'Bacelor Sains Bioperubatan dengan Kepujian', 'bacelor-sains-bioperubatan-dengan-kepujian', 'DEGREE', 'UP6421001'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'Doktor Perubatan', 'doktor-perubatan', 'DEGREE', 'UP6721001'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'Bacelor Kejururawatan dengan Kepujian', 'bacelor-kejururawatan-dengan-kepujian', 'DEGREE', 'UP6723001'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'Bacelor Sains Dietetik dengan Kepujian', 'bacelor-sains-dietetik-dengan-kepujian', 'DEGREE', 'UP6726001'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'Bacelor Sains Pemakanan dan Kesihatan Komuniti dengan Kepujian', 'bacelor-sains-pemakanan-dan-kesihatan-komuniti-dengan-kepujian', 'DEGREE', 'UP6726002'),
    ('Fakulti Perubatan dan Sains Kesihatan', 'Bacelor Sains Kesihatan Persekitaran dan Pekerjaan dengan Kepujian', 'bacelor-sains-kesihatan-persekitaran-dan-pekerjaan-dengan-kepujian', 'DEGREE', 'UP6862001'),
    ('Fakulti Rekabentuk dan Senibina', 'Bacelor Reka Bentuk (Reka Bentuk Perindustrian) dengan Kepujian', 'bacelor-reka-bentuk-reka-bentuk-perindustrian-dengan-kepujian', 'DEGREE', 'UP6214001'),
    ('Fakulti Rekabentuk dan Senibina', 'Bacelor Seni Bina Landskap dengan Kepujian', 'bacelor-seni-bina-landskap-dengan-kepujian', 'DEGREE', 'UP6581001'),
    ('Fakulti Rekabentuk dan Senibina', 'Bacelor Sains Seni Bina dengan Kepujian', 'bacelor-sains-seni-bina-dengan-kepujian', 'DEGREE', 'UP6581002'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'Bacelor Sains Komputer (Sistem Komputer) dengan Kepujian', 'bacelor-sains-komputer-sistem-komputer-dengan-kepujian', 'DEGREE', 'UP6481001'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'Bacelor Sains Komputer (Multimedia) dengan Kepujian', 'bacelor-sains-komputer-multimedia-dengan-kepujian', 'DEGREE', 'UP6481002'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'Bacelor Kejuruteraan Perisian dengan Kepujian', 'bacelor-kejuruteraan-perisian-dengan-kepujian', 'DEGREE', 'UP6481003'),
    ('Fakulti Sains Komputer dan Teknologi Maklumat', 'Bacelor Sains Komputer (Rangkaian Komputer) dengan Kepujian', 'bacelor-sains-komputer-rangkaian-komputer-dengan-kepujian', 'DEGREE', 'UP6481004'),
    ('Fakulti Bioteknologi dan Sains Biomolekul', 'Bacelor Sains Biokimia dengan Kepujian', 'bacelor-sains-biokimia-dengan-kepujian', 'DEGREE', 'UP6421003'),
    ('Fakulti Bioteknologi dan Sains Biomolekul', 'Bacelor Sains Mikrobiologi dengan Kepujian', 'bacelor-sains-mikrobiologi-dengan-kepujian', 'DEGREE', 'UP6421004'),
    ('Fakulti Bioteknologi dan Sains Biomolekul', 'Bacelor Sains Biologi Sel dan Molekul dengan Kepujian', 'bacelor-sains-biologi-sel-dan-molekul-dengan-kepujian', 'DEGREE', 'UP6421005'),
    ('Fakulti Bioteknologi dan Sains Biomolekul', 'Bacelor Sains Bioteknologi dengan Kepujian', 'bacelor-sains-bioteknologi-dengan-kepujian', 'DEGREE', 'UP6545001'),
    ('Fakulti Sains Pertanian dan Perhutanan (Kampus Bintulu, Sarawak)', 'Bacelor Sains Bioindustri dengan Kepujian', 'bacelor-sains-bioindustri-dengan-kepujian', 'DEGREE', 'UP6621003'),
    ('Fakulti Sains Pertanian dan Perhutanan (Kampus Bintulu, Sarawak)', 'Bacelor Sains Perhutanan dengan Kepujian (Kampus Bintulu, Sarawak)', 'bacelor-sains-perhutanan-dengan-kepujian-kampus-bintulu-sarawak', 'DEGREE', 'UP6623002'),
    ('Fakulti Sains Pertanian dan Perhutanan (Kampus Bintulu, Sarawak)', 'Bacelor Sains Akuakultur dengan Kepujian (Kampus Bintulu, Sarawak)', 'bacelor-sains-akuakultur-dengan-kepujian-kampus-bintulu-sarawak', 'DEGREE', 'UP6624002'),
    ('Fakulti Kemanusiaan, Pengurusan dan Sains (Kampus Bintulu, Sarawak)', 'Bacelor Sains Pembangunan Manusia dengan Pengurusan (Kepujian)', 'bacelor-sains-pembangunan-manusia-dengan-pengurusan-kepujian', 'DEGREE', 'UP6345006'),
    ('Fakulti Kemanusiaan, Pengurusan dan Sains (Kampus Bintulu, Sarawak)', 'Bacelor Sains Kimia Perindustrian dengan Kepujian', 'bacelor-sains-kimia-perindustrian-dengan-kepujian', 'DEGREE', 'UP6442004')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-putra-malaysia'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Undang-Undang (Kepujian)', 'sarjana-muda-undang-undang-kepujian', 'DEGREE', 'UY6380001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Perakaunan (Kepujian)', 'sarjana-muda-perakaunan-kepujian', 'DEGREE', 'UY6344001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Pentadbiran Perniagaan (Kepujian)', 'sarjana-muda-pentadbiran-perniagaan-kepujian', 'DEGREE', 'UY6345001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Ekonomi (Kepujian)', 'sarjana-muda-ekonomi-kepujian', 'DEGREE', 'UY6314001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kewangan (Kewangan Islam) (Kepujian)', 'sarjana-muda-kewangan-kewangan-islam-kepujian', 'DEGREE', 'UY6343001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda dalam Teknologi Maklumat (Kepujian)', 'sarjana-muda-dalam-teknologi-maklumat-kepujian', 'DEGREE', 'UY6481002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda dalam Sains Komputer (Kepujian)', 'sarjana-muda-dalam-sains-komputer-kepujian', 'DEGREE', 'UY6481001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Elektrik dan Elektronik dengan Kepujian', 'sarjana-muda-kejuruteraan-elektrik-dan-elektronik-dengan-kepujian', 'DEGREE', 'UY6523001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Mekanikal dengan Kepujian', 'sarjana-muda-kejuruteraan-mekanikal-dengan-kepujian', 'DEGREE', 'UY6525002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Kimia dengan Kepujian', 'sarjana-muda-kejuruteraan-kimia-dengan-kepujian', 'DEGREE', 'UY6524001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Pembuatan dengan Kepujian', 'sarjana-muda-kejuruteraan-pembuatan-dengan-kepujian', 'DEGREE', 'UY6540001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Mekatronik dengan Kepujian', 'sarjana-muda-kejuruteraan-mekatronik-dengan-kepujian', 'DEGREE', 'UY6523002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Aeroangkasa dengan Kepujian', 'sarjana-muda-kejuruteraan-aeroangkasa-dengan-kepujian', 'DEGREE', 'UY6525001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Bahan dengan Kepujian', 'sarjana-muda-kejuruteraan-bahan-dengan-kepujian', 'DEGREE', 'UY6527001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejuruteraan Awam dengan Kepujian', 'sarjana-muda-kejuruteraan-awam-dengan-kepujian', 'DEGREE', 'UY6526001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Bioteknologi (Kepujian)', 'sarjana-muda-bioteknologi-kepujian', 'DEGREE', 'UY6545001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Matematik (Kepujian)', 'sarjana-muda-sains-matematik-kepujian', 'DEGREE', 'UY6461001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains dalam Kimia Gunaan (Kepujian)', 'sarjana-muda-sains-dalam-kimia-gunaan-kepujian', 'DEGREE', 'UY6545004'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains dalam Fizik (Kepujian)', 'sarjana-muda-sains-dalam-fizik-kepujian', 'DEGREE', 'UY6545003'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains dalam Sains Tumbuhan Gunaan (Kepujian)', 'sarjana-muda-sains-dalam-sains-tumbuhan-gunaan-kepujian', 'DEGREE', 'UY6545002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains dalam Sains Marin dan Teknologi (Kepujian)', 'sarjana-muda-sains-dalam-sains-marin-dan-teknologi-kepujian', 'DEGREE', 'UY6545005'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains (Pengajian Seni Bina) (Kepujian)', 'sarjana-muda-sains-pengajian-seni-bina-kepujian', 'DEGREE', 'UY6581002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Perancangan Bandar dan Wilayah (Kepujian)', 'sarjana-muda-perancangan-bandar-dan-wilayah-kepujian', 'DEGREE', 'UY6581003'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Senibina Landskap (Kepujian)', 'sarjana-muda-senibina-landskap-kepujian', 'DEGREE', 'UY6581001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Ukur Bahan (Kepujian)', 'sarjana-muda-ukur-bahan-kepujian', 'DEGREE', 'UY6526002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Seni Gunaan dan Seni Reka (Kepujian)', 'sarjana-muda-seni-gunaan-dan-seni-reka-kepujian', 'DEGREE', 'UY6581004'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda dalam Pengurusan Industri Halal (Kepujian)', 'sarjana-muda-dalam-pengurusan-industri-halal-kepujian', 'DEGREE', 'UY6345002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Kemanusiaan dalam Komunikasi (Kepujian)', 'sarjana-muda-sains-kemanusiaan-dalam-komunikasi-kepujian', 'DEGREE', 'UY6321001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Kemanusiaan dalam Bahasa dan Kesusasteraan Inggeris (Kepujian)', 'sarjana-muda-sains-kemanusiaan-dalam-bahasa-dan-kesusasteraan-inggeris-kepujian', 'DEGREE', 'UY6222001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Kemanusiaan dalam Sejarah dan Tamadun (Kepujian)', 'sarjana-muda-sains-kemanusiaan-dalam-sejarah-dan-tamadun-kepujian', 'DEGREE', 'UY6227001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Kemanusiaan dalam Psikologi (Kepujian)', 'sarjana-muda-sains-kemanusiaan-dalam-psikologi-kepujian', 'DEGREE', 'UY6311001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Kemanusiaan dalam Sains Politik (Kepujian)', 'sarjana-muda-sains-kemanusiaan-dalam-sains-politik-kepujian', 'DEGREE', 'UY6313001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Kemanusiaan dalam Sosiologi dan Antropologi (Kepujian)', 'sarjana-muda-sains-kemanusiaan-dalam-sosiologi-dan-antropologi-kepujian', 'DEGREE', 'UY6312001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sastera dalam Bahasa Melayu untuk Komunikasi Antarabangsa (Kepujian)', 'sarjana-muda-sastera-dalam-bahasa-melayu-untuk-komunikasi-antarabangsa-kepujian', 'DEGREE', 'UY6222003'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sastera dalam Bahasa Inggeris untuk Komunikasi Antarabangsa (Kepujian)', 'sarjana-muda-sastera-dalam-bahasa-inggeris-untuk-komunikasi-antarabangsa-kepujian', 'DEGREE', 'UY6222002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sastera dalam Pengurusan Pelancongan (Kepujian)', 'sarjana-muda-sastera-dalam-pengurusan-pelancongan-kepujian', 'DEGREE', 'UY6812002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Pendidikan dalam Pengajaran Bahasa Inggeris Sebagai Bahasa Kedua (Kepujian)', 'sarjana-muda-pendidikan-dalam-pengajaran-bahasa-inggeris-sebagai-bahasa-kedua-kepujian', 'DEGREE', 'UY6145002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Pendidikan dalam Bimbingan dan Kaunseling (Kepujian)', 'sarjana-muda-pendidikan-dalam-bimbingan-dan-kaunseling-kepujian', 'DEGREE', 'UY6145001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sains Bioperubatan (Kepujian)', 'sarjana-muda-sains-bioperubatan-kepujian', 'DEGREE', 'UY6720001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Audiologi (Kepujian)', 'sarjana-muda-audiologi-kepujian', 'DEGREE', 'UY6720004'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Optometri (Kepujian)', 'sarjana-muda-optometri-kepujian', 'DEGREE', 'UY6720002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Dietetik (Kepujian)', 'sarjana-muda-dietetik-kepujian', 'DEGREE', 'UY6720003'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Pengimejan Perubatan (Kepujian)', 'sarjana-muda-pengimejan-perubatan-kepujian', 'DEGREE', 'UY6720005'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Fisioterapi (Kepujian)', 'sarjana-muda-fisioterapi-kepujian', 'DEGREE', 'UY6720006'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Patologi Pertuturan - Bahasa (Kepujian)', 'sarjana-muda-patologi-pertuturan-bahasa-kepujian', 'DEGREE', 'UY6720007'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Farmasi (Kepujian)', 'sarjana-muda-farmasi-kepujian', 'DEGREE', 'UY6727001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Kejururawatan (Kepujian)', 'sarjana-muda-kejururawatan-kepujian', 'DEGREE', 'UY6723001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Ilmu Wahyu dan Warisan Islam dalam Bahasa dan Kesusasteraan Arab (Kepujian)', 'sarjana-muda-ilmu-wahyu-dan-warisan-islam-dalam-bahasa-dan-kesusasteraan-arab-kepujian', 'DEGREE', 'UY6224001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Ilmu Wahyu dan Warisan Islam dalam Fiqh dan Usul Fiqh (Kepujian)', 'sarjana-muda-ilmu-wahyu-dan-warisan-islam-dalam-fiqh-dan-usul-fiqh-kepujian', 'DEGREE', 'UY6221002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Ilmu Wahyu dan Warisan Islam dalam Usuluddin dan Perbandingan Agama (Kepujian)', 'sarjana-muda-ilmu-wahyu-dan-warisan-islam-dalam-usuluddin-dan-perbandingan-agama-kepujian', 'DEGREE', 'UY6221003'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Ilmu Wahyu dan Warisan Islam dalam Pengajian Qur''an dan Sunnah (Kepujian)', 'sarjana-muda-ilmu-wahyu-dan-warisan-islam-dalam-pengajian-qur-an-dan-sunnah-kepujian', 'DEGREE', 'UY6221001'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Sastera dalam Bahasa Arab untuk Komunikasi Antarabangsa (Kepujian)', 'sarjana-muda-sastera-dalam-bahasa-arab-untuk-komunikasi-antarabangsa-kepujian', 'DEGREE', 'UY6224002'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Pendidikan dalam Pengajaran Bahasa Arab Sebagai Bahasa Kedua (Kepujian)', 'sarjana-muda-pendidikan-dalam-pengajaran-bahasa-arab-sebagai-bahasa-kedua-kepujian', 'DEGREE', 'UY6145004'),
    ('Not Publicly Itemised (Pending Verification)', 'Sarjana Muda Pendidikan dalam Pendidikan Islam (Kepujian)', 'sarjana-muda-pendidikan-dalam-pendidikan-islam-kepujian', 'DEGREE', 'UY6145003')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-islam-antarabangsa-malaysia'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Fakulti Sains Sosial Gunaan', 'Ijazah Sarjana Muda Pendidikan (Pendidikan Islam) dengan Kepujian', 'ijazah-sarjana-muda-pendidikan-pendidikan-islam-dengan-kepujian', 'DEGREE', 'UD6146001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Reka Bentuk Perindustrian dengan Kepujian', 'sarjana-muda-reka-bentuk-perindustrian-dengan-kepujian', 'DEGREE', 'UD6214001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pengajian Islam (Usuluddin) dengan Kepujian', 'sarjana-muda-pengajian-islam-usuluddin-dengan-kepujian', 'DEGREE', 'UD6221001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pengajian Islam (Syariah) dengan Kepujian', 'sarjana-muda-pengajian-islam-syariah-dengan-kepujian', 'DEGREE', 'UD6221002'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pengajian Islam (Dakwah) dengan Kepujian', 'sarjana-muda-pengajian-islam-dakwah-dengan-kepujian', 'DEGREE', 'UD6221003'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Usuluddin dengan Kaunseling (Kepujian)', 'sarjana-muda-usuluddin-dengan-kaunseling-kepujian', 'DEGREE', 'UD6221004'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Al-Quran dan Al-Sunnah (Qiraat) dengan Kepujian', 'sarjana-muda-al-quran-dan-al-sunnah-qiraat-dengan-kepujian', 'DEGREE', 'UD6221005'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Bahasa Melayu Kontemporari dengan Media Interaktif (Kepujian)', 'sarjana-muda-bahasa-melayu-kontemporari-dengan-media-interaktif-kepujian', 'DEGREE', 'UD6223001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Bahasa Inggeris dengan Komunikasi (Kepujian)', 'sarjana-muda-bahasa-inggeris-dengan-komunikasi-kepujian', 'DEGREE', 'UD6224001'),
    ('Fakulti Sains Sosial Gunaan', 'Ijazah Sarjana Muda Pengajian Bahasa Arab (dengan Kepujian)', 'ijazah-sarjana-muda-pengajian-bahasa-arab-dengan-kepujian', 'DEGREE', 'UD6224002'),
    ('Fakulti Sains Sosial Gunaan', 'Ijazah Sarjana Muda Sains Sosial (Antropologi dan Dakwah) dengan Kepujian', 'ijazah-sarjana-muda-sains-sosial-antropologi-dan-dakwah-dengan-kepujian', 'DEGREE', 'UD6312001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Hubungan Antarabangsa dengan Kepujian', 'sarjana-muda-hubungan-antarabangsa-dengan-kepujian', 'DEGREE', 'UD6313001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Perhubungan Awam dengan Media Kontemporari', 'sarjana-muda-perhubungan-awam-dengan-media-kontemporari', 'DEGREE', 'UD6321001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pentadbiran Perniagaan (Kewangan Islam) dengan Kepujian', 'sarjana-muda-pentadbiran-perniagaan-kewangan-islam-dengan-kepujian', 'DEGREE', 'UD6343001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Perakaunan dengan Kepujian', 'sarjana-muda-perakaunan-dengan-kepujian', 'DEGREE', 'UD6344001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pentadbiran Perniagaan (Pengurusan Risiko dan Takaful) dengan Kepujian', 'sarjana-muda-pentadbiran-perniagaan-pengurusan-risiko-dan-takaful-dengan-kepujian', 'DEGREE', 'UD6345001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pengurusan Kekayaan Islam dengan Kepujian', 'sarjana-muda-pengurusan-kekayaan-islam-dengan-kepujian', 'DEGREE', 'UD6345002'),
    ('Fakulti Sains Sosial Gunaan', 'Ijazah Sarjana Muda Undang-Undang dengan Kepujian', 'ijazah-sarjana-muda-undang-undang-dengan-kepujian', 'DEGREE', 'UD6380001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Komputer (Pembangunan Perisian) dengan Kepujian', 'sarjana-muda-sains-komputer-pembangunan-perisian-dengan-kepujian', 'DEGREE', 'UD6481001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Komputer (Keselamatan Rangkaian Komputer) dengan Kepujian', 'sarjana-muda-sains-komputer-keselamatan-rangkaian-komputer-dengan-kepujian', 'DEGREE', 'UD6481002'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Komputer (Komputeran Internet) dengan Kepujian', 'sarjana-muda-sains-komputer-komputeran-internet-dengan-kepujian', 'DEGREE', 'UD6481003'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Teknologi Maklumat (Informatik Media) dengan Kepujian', 'sarjana-muda-teknologi-maklumat-informatik-media-dengan-kepujian', 'DEGREE', 'UD6481004'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Teknologi Kejuruteraan Pembuatan (Reka Bentuk Produk) dengan Kepujian', 'sarjana-muda-teknologi-kejuruteraan-pembuatan-reka-bentuk-produk-dengan-kepujian', 'DEGREE', 'UD6540001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Teknologi Makanan dengan Kepujian', 'sarjana-muda-teknologi-makanan-dengan-kepujian', 'DEGREE', 'UD6541001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pembangunan Makanan Halal dengan Kepujian', 'sarjana-muda-pembangunan-makanan-halal-dengan-kepujian', 'DEGREE', 'UD6541002'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Agrobioteknologi dengan Kepujian', 'sarjana-muda-agrobioteknologi-dengan-kepujian', 'DEGREE', 'UD6545001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Teknologi Polimer dengan Kepujian', 'sarjana-muda-teknologi-polimer-dengan-kepujian', 'DEGREE', 'UD6545002'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Perniagaantani dengan Kepujian', 'sarjana-muda-perniagaantani-dengan-kepujian', 'DEGREE', 'UD6620001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Teknologi Pembiakbakaan Tumbuhan dengan Kepujian', 'sarjana-muda-teknologi-pembiakbakaan-tumbuhan-dengan-kepujian', 'DEGREE', 'UD6621001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Agronomi dengan Kepujian', 'sarjana-muda-agronomi-dengan-kepujian', 'DEGREE', 'UD6621002'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains (Kepujian) Sains Akuatik', 'sarjana-muda-sains-kepujian-sains-akuatik', 'DEGREE', 'UD6624001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Produksi dan Kesihatan Haiwan dengan Kepujian', 'sarjana-muda-produksi-dan-kesihatan-haiwan-dengan-kepujian', 'DEGREE', 'UD6640001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Bioperubatan dengan Kepujian', 'sarjana-muda-sains-bioperubatan-dengan-kepujian', 'DEGREE', 'UD6720001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Perubatan dan Pembedahan', 'sarjana-muda-perubatan-dan-pembedahan', 'DEGREE', 'UD6721001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Perubatan dan Kesihatan dengan Kepujian', 'sarjana-muda-sains-perubatan-dan-kesihatan-dengan-kepujian', 'DEGREE', 'UD6722001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Kejururawatan (Kepujian)', 'sarjana-muda-sains-kejururawatan-kepujian', 'DEGREE', 'UD6723001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pengimejan Perubatan (Kepujian)', 'sarjana-muda-pengimejan-perubatan-kepujian', 'DEGREE', 'UD6725001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Dietetik (Kepujian)', 'sarjana-muda-dietetik-kepujian', 'DEGREE', 'UD6726001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Pemakanan (Kepujian)', 'sarjana-muda-sains-pemakanan-kepujian', 'DEGREE', 'UD6726002'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Farmasi (Kepujian)', 'sarjana-muda-farmasi-kepujian', 'DEGREE', 'UD6727001'),
    ('Fakulti Sains Sosial Gunaan', 'Ijazah Sarjana Muda Kerja Sosial dengan Kepujian', 'ijazah-sarjana-muda-kerja-sosial-dengan-kepujian', 'DEGREE', 'UD6762001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Pelancongan Islam dengan Kepujian', 'sarjana-muda-pelancongan-islam-dengan-kepujian', 'DEGREE', 'UD6812001'),
    ('Fakulti Sains Sosial Gunaan', 'Sarjana Muda Sains Sosial Persekitaran dengan Kepujian', 'sarjana-muda-sains-sosial-persekitaran-dengan-kepujian', 'DEGREE', 'UD6310001')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-sultan-zainal-abidin'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Kolej Pengajian', 'Sarjana Muda Linguistik dan Teknologi Maklumat dengan Kepujian', 'sarjana-muda-linguistik-dan-teknologi-maklumat-dengan-kepujian', 'DEGREE', 'UU6222001'),
    ('Kolej Pengajian', 'Sarjana Muda Kesusasteraan Kontemporari dan Pengurusan Industri Kreatif dengan Kepujian', 'sarjana-muda-kesusasteraan-kontemporari-dan-pengurusan-industri-kreatif-dengan-kepujian', 'DEGREE', 'UU6222002'),
    ('Kolej Pengajian', 'Sarjana Muda Linguistik Terapan dan Pentadbiran Perniagaan dengan Kepujian', 'sarjana-muda-linguistik-terapan-dan-pentadbiran-perniagaan-dengan-kepujian', 'DEGREE', 'UU6224001'),
    ('Kolej Pengajian', 'Sarjana Muda Sejarah Gunaan dengan Kepujian', 'sarjana-muda-sejarah-gunaan-dengan-kepujian', 'DEGREE', 'UU6227001'),
    ('Kolej Pengajian', 'Sarjana Muda Sains dengan Kepujian (Teknologi Maklumat)', 'sarjana-muda-sains-dengan-kepujian-teknologi-maklumat', 'DEGREE', 'UU6481001'),
    ('Kolej Pengajian', 'Sarjana Muda Sains Komputer dengan Kepujian', 'sarjana-muda-sains-komputer-dengan-kepujian', 'DEGREE', 'UU6481003'),
    ('Kolej Pengajian', 'Sarjana Muda Sains dengan Kepujian (Matematik Perniagaan)', 'sarjana-muda-sains-dengan-kepujian-matematik-perniagaan', 'DEGREE', 'UU6461001'),
    ('Kolej Pengajian', 'Sarjana Muda Sains Matematik Pemutusan dan Analitik Data dengan Kepujian', 'sarjana-muda-sains-matematik-pemutusan-dan-analitik-data-dengan-kepujian', 'DEGREE', 'UU6461002'),
    ('Kolej Pengajian', 'Sarjana Muda Sains dengan Kepujian (Statistik Industri)', 'sarjana-muda-sains-dengan-kepujian-statistik-industri', 'DEGREE', 'UU6462001'),
    ('Kolej Pengajian', 'Sarjana Muda Teknologi Media dengan Kepujian', 'sarjana-muda-teknologi-media-dengan-kepujian', 'DEGREE', 'UU6213001'),
    ('Kolej Pengajian', 'Sarjana Muda Sains Multimedia dengan Kepujian', 'sarjana-muda-sains-multimedia-dengan-kepujian', 'DEGREE', 'UU6213003'),
    ('Kolej Pengajian', 'Sarjana Muda Komunikasi dengan Kepujian', 'sarjana-muda-komunikasi-dengan-kepujian', 'DEGREE', 'UU6321001'),
    ('Kolej Pengajian', 'Sarjana Muda Pengurusan Industri Kreatif dengan Kepujian', 'sarjana-muda-pengurusan-industri-kreatif-dengan-kepujian', 'DEGREE', 'UU6210001'),
    ('Kolej Pengajian', 'Sarjana Muda Pendidikan dengan Kepujian (Bimbingan & Kaunseling)', 'sarjana-muda-pendidikan-dengan-kepujian-bimbingan-kaunseling', 'DEGREE', 'UU6145001'),
    ('Kolej Pengajian', 'Sarjana Muda Pendidikan dengan Kepujian (Perakaunan)', 'sarjana-muda-pendidikan-dengan-kepujian-perakaunan', 'DEGREE', 'UU6145002'),
    ('Kolej Pengajian', 'Sarjana Muda Pendidikan dengan Kepujian (Teknologi Maklumat)', 'sarjana-muda-pendidikan-dengan-kepujian-teknologi-maklumat', 'DEGREE', 'UU6145003'),
    ('Kolej Pengajian', 'Sarjana Muda Pendidikan dengan Kepujian (Pengurusan Perniagaan)', 'sarjana-muda-pendidikan-dengan-kepujian-pengurusan-perniagaan', 'DEGREE', 'UU6145004'),
    ('Kolej Pengajian', 'Sarjana Muda Pendidikan dengan Kepujian (Pendidikan Moral)', 'sarjana-muda-pendidikan-dengan-kepujian-pendidikan-moral', 'DEGREE', 'UU6145005'),
    ('Kolej Pengajian', 'Sarjana Muda Kaunseling dengan Kepujian', 'sarjana-muda-kaunseling-dengan-kepujian', 'DEGREE', 'UU6762001'),
    ('Kolej Pengajian', 'Sarjana Muda Pengurusan Kerja Sosial dengan Kepujian', 'sarjana-muda-pengurusan-kerja-sosial-dengan-kepujian', 'DEGREE', 'UU6762002'),
    ('Kolej Pengajian', 'Sarjana Muda Pemasaran dengan Kepujian', 'sarjana-muda-pemasaran-dengan-kepujian', 'DEGREE', 'UU6342001'),
    ('Kolej Pengajian', 'Sarjana Muda Pentadbiran Perniagaan dengan Kepujian', 'sarjana-muda-pentadbiran-perniagaan-dengan-kepujian', 'DEGREE', 'UU6345003'),
    ('Kolej Pengajian', 'Sarjana Muda Pengurusan Sumber Manusia dengan Kepujian', 'sarjana-muda-pengurusan-sumber-manusia-dengan-kepujian', 'DEGREE', 'UU6345005'),
    ('Kolej Pengajian', 'Sarjana Muda Keusahawanan dengan Kepujian', 'sarjana-muda-keusahawanan-dengan-kepujian', 'DEGREE', 'UU6345011'),
    ('Kolej Pengajian', 'Sarjana Muda Keusahawanan dengan Kepujian (Mod 2u2i)', 'sarjana-muda-keusahawanan-dengan-kepujian-mod-2u2i', 'DEGREE', 'UU6345013'),
    ('Kolej Pengajian', 'Sarjana Muda Kewangan dan Perbankan Islam dengan Kepujian', 'sarjana-muda-kewangan-dan-perbankan-islam-dengan-kepujian', 'DEGREE', 'UU6343002'),
    ('Kolej Pengajian', 'Sarjana Muda Pentadbiran Muamalat dengan Kepujian', 'sarjana-muda-pentadbiran-muamalat-dengan-kepujian', 'DEGREE', 'UU6345010'),
    ('Kolej Pengajian', 'Sarjana Muda Pengurusan Halal dengan Kepujian (Mod 3u1i)', 'sarjana-muda-pengurusan-halal-dengan-kepujian-mod-3u1i', 'DEGREE', 'UU6345014'),
    ('Kolej Pengajian', 'Sarjana Muda Perakaunan dengan Kepujian', 'sarjana-muda-perakaunan-dengan-kepujian', 'DEGREE', 'UU6344001'),
    ('Kolej Pengajian', 'Sarjana Muda Perakaunan (Sistem Maklumat) dengan Kepujian', 'sarjana-muda-perakaunan-sistem-maklumat-dengan-kepujian', 'DEGREE', 'UU6344002'),
    ('Kolej Pengajian', 'Sarjana Muda Sains Ekonomi dengan Kepujian', 'sarjana-muda-sains-ekonomi-dengan-kepujian', 'DEGREE', 'UU6314001'),
    ('Kolej Pengajian', 'Sarjana Muda Kewangan dengan Kepujian', 'sarjana-muda-kewangan-dengan-kepujian', 'DEGREE', 'UU6343001'),
    ('Kolej Pengajian', 'Sarjana Muda Perbankan dengan Kepujian', 'sarjana-muda-perbankan-dengan-kepujian', 'DEGREE', 'UU6343003'),
    ('Kolej Pengajian', 'Sarjana Muda Pengurusan Risiko dan Insurans dengan Kepujian', 'sarjana-muda-pengurusan-risiko-dan-insurans-dengan-kepujian', 'DEGREE', 'UU6343004'),
    ('Kolej Pengajian', 'Sarjana Muda Sains Pengurusan Perniagaantani dengan Kepujian', 'sarjana-muda-sains-pengurusan-perniagaantani-dengan-kepujian', 'DEGREE', 'UU6345004'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pentadbiran Perniagaan (Pengurusan Golf) dengan Kepujian', 'sarjana-muda-pentadbiran-perniagaan-pengurusan-golf-dengan-kepujian', 'DEGREE', 'UU6345009'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Operasi dengan Kepujian', 'sarjana-muda-pengurusan-operasi-dengan-kepujian', 'DEGREE', 'UU6345012'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Teknologi dengan Kepujian', 'sarjana-muda-pengurusan-teknologi-dengan-kepujian', 'DEGREE', 'UU6481002'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Logistik dan Pengangkutan dengan Kepujian', 'sarjana-muda-pengurusan-logistik-dan-pengangkutan-dengan-kepujian', 'DEGREE', 'UU6840001'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Awam dengan Kepujian', 'sarjana-muda-pengurusan-awam-dengan-kepujian', 'DEGREE', 'UU6345002'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Pembangunan dengan Kepujian', 'sarjana-muda-pengurusan-pembangunan-dengan-kepujian', 'DEGREE', 'UU6345008'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Falsafah, Undang-Undang dan Perniagaan dengan Kepujian', 'sarjana-muda-falsafah-undang-undang-dan-perniagaan-dengan-kepujian', 'DEGREE', 'UU6345001'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Undang-Undang dengan Kepujian', 'sarjana-muda-undang-undang-dengan-kepujian', 'DEGREE', 'UU6380001'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Perniagaan Antarabangsa dengan Kepujian', 'sarjana-muda-pengurusan-perniagaan-antarabangsa-dengan-kepujian', 'DEGREE', 'UU6345006'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Hal Ehwal Antarabangsa dengan Kepujian', 'sarjana-muda-pengurusan-hal-ehwal-antarabangsa-dengan-kepujian', 'DEGREE', 'UU6345007'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Hospitaliti dengan Kepujian', 'sarjana-muda-pengurusan-hospitaliti-dengan-kepujian', 'DEGREE', 'UU6811001'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Pelancongan dengan Kepujian', 'sarjana-muda-pengurusan-pelancongan-dengan-kepujian', 'DEGREE', 'UU6812001'),
    ('Akademi Golf Nasional UUM', 'Sarjana Muda Pengurusan Acara dengan Kepujian', 'sarjana-muda-pengurusan-acara-dengan-kepujian', 'DEGREE', 'UU6812002')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-utara-malaysia'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Sains Marin) dengan Kepujian', 'sarjana-muda-sains-sains-marin-dengan-kepujian', 'DEGREE', 'UG6443001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Biologi Marin) dengan Kepujian', 'sarjana-muda-sains-biologi-marin-dengan-kepujian', 'DEGREE', 'UG6443002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Sains Biologi) dengan Kepujian', 'sarjana-muda-sains-sains-biologi-dengan-kepujian', 'DEGREE', 'UG6421001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Sains Kimia) dengan Kepujian', 'sarjana-muda-sains-sains-kimia-dengan-kepujian', 'DEGREE', 'UG6442001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Geosains Marin) dengan Kepujian', 'sarjana-muda-sains-geosains-marin-dengan-kepujian', 'DEGREE', 'UG6443003'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Gunaan (Pemuliharaan dan Pengurusan Biodiversiti) dengan Kepujian', 'sarjana-muda-sains-gunaan-pemuliharaan-dan-pengurusan-biodiversiti-dengan-kepujian', 'DEGREE', 'UG6422001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Kimia Analisis dan Persekitaran) dengan Kepujian', 'sarjana-muda-sains-kimia-analisis-dan-persekitaran-dengan-kepujian', 'DEGREE', 'UG6422002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Nanofizik dengan Kepujian', 'sarjana-muda-sains-nanofizik-dengan-kepujian', 'DEGREE', 'UG6441001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Komputer (Kejuruteraan Perisian) dengan Kepujian', 'sarjana-muda-sains-komputer-kejuruteraan-perisian-dengan-kepujian', 'DEGREE', 'UG6481002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Komputer dengan Informatik Maritim dengan Kepujian', 'sarjana-muda-sains-komputer-dengan-informatik-maritim-dengan-kepujian', 'DEGREE', 'UG6481003'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Analitik Data) dengan Kepujian', 'sarjana-muda-sains-analitik-data-dengan-kepujian', 'DEGREE', 'UG6461003'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Matematik Kewangan) dengan Kepujian', 'sarjana-muda-sains-matematik-kewangan-dengan-kepujian', 'DEGREE', 'UG6461002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Matematik Gunaan) dengan Kepujian', 'sarjana-muda-sains-matematik-gunaan-dengan-kepujian', 'DEGREE', 'UG6461001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Gunaan (Elektronik dan Instrumentasi) dengan Kepujian', 'sarjana-muda-sains-gunaan-elektronik-dan-instrumentasi-dengan-kepujian', 'DEGREE', 'UG6545001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Teknologi (Alam Sekitar) dengan Kepujian', 'sarjana-muda-teknologi-alam-sekitar-dengan-kepujian', 'DEGREE', 'UG6422003'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Gunaan (Teknologi Maritim) dengan Kepujian', 'sarjana-muda-sains-gunaan-teknologi-maritim-dengan-kepujian', 'DEGREE', 'UG6525001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Teknologi Kejuruteraan Mekanikal (Senibina Kapal) Dengan Kepujian', 'sarjana-muda-teknologi-kejuruteraan-mekanikal-senibina-kapal-dengan-kepujian', 'DEGREE', 'UG6525003'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Teknologi Tenaga Boleh Diperbaharui Dengan Kepujian', 'sarjana-muda-teknologi-tenaga-boleh-diperbaharui-dengan-kepujian', 'DEGREE', 'UG6400001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Teknologi Elektrik (Tenaga Dan Kuasa) Dengan Kepujian', 'sarjana-muda-teknologi-elektrik-tenaga-dan-kuasa-dengan-kepujian', 'DEGREE', 'UG6522001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Gunaan (Teknologi Maritim) Dengan Kepujian (Dual Degree)', 'sarjana-muda-sains-gunaan-teknologi-maritim-dengan-kepujian-dual-degree', 'DEGREE', 'UG6525004'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Keselamatan Dan Kesihatan Pekerjaan Dengan Teknologi Persekitaran (Kepujian)', 'sarjana-muda-sains-keselamatan-dan-kesihatan-pekerjaan-dengan-teknologi-persekitaran-kepujian', 'DEGREE', 'UG6862001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Gunaan (Perikanan) dengan Kepujian', 'sarjana-muda-sains-gunaan-perikanan-dengan-kepujian', 'DEGREE', 'UG6624001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Akuakultur dengan Kepujian', 'sarjana-muda-sains-akuakultur-dengan-kepujian', 'DEGREE', 'UG6624002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Diploma Perikanan', 'diploma-perikanan', 'DIPLOMA', 'UG4624001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Ekonomi (Sumber Alam) dengan Kepujian', 'sarjana-muda-ekonomi-sumber-alam-dengan-kepujian', 'DEGREE', 'UG6314001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Pengurusan (Pemasaran) dengan Kepujian', 'sarjana-muda-pengurusan-pemasaran-dengan-kepujian', 'DEGREE', 'UG6342001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Perakaunan dengan Kepujian', 'sarjana-muda-perakaunan-dengan-kepujian', 'DEGREE', 'UG6344001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Kaunseling dengan Kepujian', 'sarjana-muda-kaunseling-dengan-kepujian', 'DEGREE', 'UG6762001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Pengurusan (Pengajian Polisi) dengan Kepujian', 'sarjana-muda-pengurusan-pengajian-polisi-dengan-kepujian', 'DEGREE', 'UG6762002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Pengurusan Pelancongan dengan Kepujian', 'sarjana-muda-pengurusan-pelancongan-dengan-kepujian', 'DEGREE', 'UG6812001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Kewangan dengan Kepujian', 'sarjana-muda-kewangan-dengan-kepujian', 'DEGREE', 'UG6343001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Pengurusan (Maritim) dengan Kepujian', 'sarjana-muda-pengurusan-maritim-dengan-kepujian', 'DEGREE', 'UG6345001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Pengurusan Operasi Maritim dengan Kepujian dengan Kepujian', 'sarjana-muda-pengurusan-operasi-maritim-dengan-kepujian-dengan-kepujian', 'DEGREE', 'UG6525002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains (Sains Nautika dan Pengangkutan Maritim) dengan Kepujian', 'sarjana-muda-sains-sains-nautika-dan-pengangkutan-maritim-dengan-kepujian', 'DEGREE', 'UG6840001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Makanan (Perkhidmatan Makanan dan Pemakanan) dengan Kepujian', 'sarjana-muda-sains-makanan-perkhidmatan-makanan-dan-pemakanan-dengan-kepujian', 'DEGREE', 'UG6541001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Makanan (Teknologi Makanan) dengan Kepujian', 'sarjana-muda-sains-makanan-teknologi-makanan-dengan-kepujian', 'DEGREE', 'UG6541002'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Sains Agroteknologi (Sains Tanaman) dengan Kepujian', 'sarjana-muda-sains-agroteknologi-sains-tanaman-dengan-kepujian', 'DEGREE', 'UG6621001'),
    ('Fakulti Sains Makanan dan Agroteknologi (FSMA)', 'Sarjana Muda Teknologi Pemprosesan Agro dengan Kepujian', 'sarjana-muda-teknologi-pemprosesan-agro-dengan-kepujian', 'DEGREE', 'UG6621002')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-malaysia-terengganu'
ON CONFLICT (faculty_id, slug) DO NOTHING;

INSERT INTO programmes (faculty_id, name, slug, study_level, admission_code)
SELECT fac.id, p.name, p.slug, p.study_level, p.admission_code
FROM universities u
JOIN faculties fac ON fac.university_id = u.id
JOIN (VALUES
    ('Fakulti Teknologi Kreatif & Warisan (FTKW)', 'Ijazah Sarjana Muda Teknologi Kreatif Dengan Kepujian', 'ijazah-sarjana-muda-teknologi-kreatif-dengan-kepujian', 'DEGREE', 'UL6213001'),
    ('Fakulti Teknologi Kreatif & Warisan (FTKW)', 'Ijazah Sarjana Muda Pengajian Warisan Dengan Kepujian', 'ijazah-sarjana-muda-pengajian-warisan-dengan-kepujian', 'DEGREE', 'UL6225001'),
    ('Fakulti Senibina dan Ekistik (FSE)', 'Ijazah Sarjana Muda Senibina Landskap Dengan Kepujian', 'ijazah-sarjana-muda-senibina-landskap-dengan-kepujian', 'DEGREE', 'UL6581001'),
    ('Fakulti Senibina dan Ekistik (FSE)', 'Ijazah Sarjana Muda Sains Senibina Dengan Kepujian', 'ijazah-sarjana-muda-sains-senibina-dengan-kepujian', 'DEGREE', 'UL6581002'),
    ('Fakulti Senibina dan Ekistik (FSE)', 'Ijazah Sarjana Muda Senibina Dalaman Dengan Kepujian', 'ijazah-sarjana-muda-senibina-dalaman-dengan-kepujian', 'DEGREE', 'UL6214001'),
    ('Fakulti Pengajian Bahasa dan Pembangunan Insan (FBI)', 'Ijazah Sarjana Muda Komunikasi Perniagaan Dengan Bahasa Inggeris Kepujian', 'ijazah-sarjana-muda-komunikasi-perniagaan-dengan-bahasa-inggeris-kepujian', 'DEGREE', 'UL6321001'),
    ('Fakulti Pengajian Bahasa dan Pembangunan Insan (FBI)', 'Ijazah Sarjana Muda Bahasa Arab Dengan Keusahawanan Kepujian', 'ijazah-sarjana-muda-bahasa-arab-dengan-keusahawanan-kepujian', 'DEGREE', 'UL6224001'),
    ('Fakulti Pengajian Bahasa dan Pembangunan Insan (FBI)', 'Ijazah Sarjana Muda Pengurusan Komuniti Dengan Keusahawanan Sosial Kepujian', 'ijazah-sarjana-muda-pengurusan-komuniti-dengan-keusahawanan-sosial-kepujian', 'DEGREE', 'UL6310001'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Keusahawanan Dengan Kepujian (2u2i)', 'ijazah-sarjana-muda-keusahawanan-dengan-kepujian-2u2i', 'DEGREE', 'UL6340001'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Keusahawanan (Peruncitan) Dengan Kepujian', 'ijazah-sarjana-muda-keusahawanan-peruncitan-dengan-kepujian', 'DEGREE', 'UL6340002'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Pentadbiran Perniagaan (Perbankan Dan Kewangan Islam) Dengan Kepujian', 'ijazah-sarjana-muda-pentadbiran-perniagaan-perbankan-dan-kewangan-islam-dengan-kepujian', 'DEGREE', 'UL6340003'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Keusahawanan (Perdagangan) Dengan Kepujian', 'ijazah-sarjana-muda-keusahawanan-perdagangan-dengan-kepujian', 'DEGREE', 'UL6345001'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Keusahawanan (Logistik Dan Perniagaan Pengedaran) Dengan Kepujian', 'ijazah-sarjana-muda-keusahawanan-logistik-dan-perniagaan-pengedaran-dengan-kepujian', 'DEGREE', 'UL6340004'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Sains (Kepujian) Statistik Dan Ijazah Sarjana Muda Keusahawan (Logistik Dan Perniagaan Pengedaran) Dengan Kepujian(3u1i)', 'ijazah-sarjana-muda-sains-kepujian-statistik-dan-ijazah-sarjana-muda-keusahawan-logistik-dan-perniagaan-pengedaran-dengan-kepujian-3u1i', 'DEGREE', 'UL6340005'),
    ('Fakulti Keusahawanan & Perniagaan (FKP)', 'Ijazah Sarjana Muda Perakaunan Dengan Kepujian', 'ijazah-sarjana-muda-perakaunan-dengan-kepujian', 'DEGREE', 'UL6344001'),
    ('Fakulti Hospitaliti, Pelancongan dan Kesejahteraan (FHPK)', 'Ijazah Sarjana Muda Keusahawanan (Hospitaliti) Dengan Kepujian', 'ijazah-sarjana-muda-keusahawanan-hospitaliti-dengan-kepujian', 'DEGREE', 'UL6345002'),
    ('Fakulti Hospitaliti, Pelancongan dan Kesejahteraan (FHPK)', 'Ijazah Sarjana Muda Keusahawanan (Pelancongan) Dengan Kepujian', 'ijazah-sarjana-muda-keusahawanan-pelancongan-dengan-kepujian', 'DEGREE', 'UL6345004'),
    ('Fakulti Hospitaliti, Pelancongan dan Kesejahteraan (FHPK)', 'Ijazah Sarjana Muda Keusahawanan (Kesejahteraan) Dengan Kepujian', 'ijazah-sarjana-muda-keusahawanan-kesejahteraan-dengan-kepujian', 'DEGREE', 'UL6345003'),
    ('Fakulti Perubatan Veterinar (FPV)', 'Doktor Perubatan Veterinar', 'doktor-perubatan-veterinar', 'DEGREE', 'UL6640001'),
    ('Fakulti Sains Data dan Komputeran (FSDK)', 'Ijazah Sarjana Muda Teknologi Maklumat Dengan Kepujian', 'ijazah-sarjana-muda-teknologi-maklumat-dengan-kepujian', 'DEGREE', 'UL6482001'),
    ('Fakulti Industri Asas Tani (FIAT)', 'Ijazah Sarjana Muda Sains Gunaan (Teknologi Penternakan) Dengan Kepujian', 'ijazah-sarjana-muda-sains-gunaan-teknologi-penternakan-dengan-kepujian', 'DEGREE', 'UL6620001'),
    ('Fakulti Industri Asas Tani (FIAT)', 'Ijazah Sarjana Muda Sains Gunaan (Jaminan Makanan) Dengan Kepujian', 'ijazah-sarjana-muda-sains-gunaan-jaminan-makanan-dengan-kepujian', 'DEGREE', 'UL6541001'),
    ('Fakulti Sains Bumi (FSB)', 'Ijazah Sarjana Muda Sains Gunaan (Sains Sumber Asli) Dengan Kepujian', 'ijazah-sarjana-muda-sains-gunaan-sains-sumber-asli-dengan-kepujian', 'DEGREE', 'UL6850001'),
    ('Fakulti Sains Bumi (FSB)', 'Ijazah Sarjana Muda Sains Gunaan (Geosains) Dengan Kepujian', 'ijazah-sarjana-muda-sains-gunaan-geosains-dengan-kepujian', 'DEGREE', 'UL6443001'),
    ('Fakulti Sains Bumi (FSB)', 'Ijazah Sarjana Muda Sains Gunaan (Sains Kelestarian Alam Sekitar) Dengan Kepujian', 'ijazah-sarjana-muda-sains-gunaan-sains-kelestarian-alam-sekitar-dengan-kepujian', 'DEGREE', 'UL6440001'),
    ('Fakulti Sains Bumi (FSB)', 'Sarjana Muda Sains Gunaan (Analitik Alam Sekitar) Dengan Kepujian', 'sarjana-muda-sains-gunaan-analitik-alam-sekitar-dengan-kepujian', 'DEGREE', 'UL6422002'),
    ('Fakulti Biokejuruteraan Dan Teknologi (FBKT)', 'Ijazah Sarjana Muda Teknologi Bioindustri Dengan Kepujian', 'ijazah-sarjana-muda-teknologi-bioindustri-dengan-kepujian', 'DEGREE', 'UL6545001'),
    ('Fakulti Biokejuruteraan Dan Teknologi (FBKT)', 'Ijazah Sarjana Muda Teknologi Bahan Industri Dengan Kepujian', 'ijazah-sarjana-muda-teknologi-bahan-industri-dengan-kepujian', 'DEGREE', 'UL6545002'),
    ('Fakulti Biokejuruteraan Dan Teknologi (FBKT)', 'Ijazah Sarjana Muda Teknologi Sumber Hutan Dengan Kepujian', 'ijazah-sarjana-muda-teknologi-sumber-hutan-dengan-kepujian', 'DEGREE', 'UL6545003'),
    ('Fakulti Biokejuruteraan Dan Teknologi (FBKT)', 'Sarjana Muda Teknologi Tenaga dengan Kepujian', 'sarjana-muda-teknologi-tenaga-dengan-kepujian', 'DEGREE', 'UL6522001'),
    ('Fakulti Biokejuruteraan Dan Teknologi (FBKT)', 'Sarjana Muda Teknologi Mineral Dengan Kepujian', 'sarjana-muda-teknologi-mineral-dengan-kepujian', 'DEGREE', 'UL6544001')
) AS p(faculty_name, name, slug, study_level, admission_code) ON fac.name = p.faculty_name
WHERE u.slug = 'universiti-malaysia-kelantan'
ON CONFLICT (faculty_id, slug) DO NOTHING;

