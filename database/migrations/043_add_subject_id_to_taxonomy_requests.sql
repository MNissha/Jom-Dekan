-- Lets a self-serve-created subject (taxonomyService.subjects.
-- findOrCreateStandalone / findOrCreateForProgramme) be tracked in
-- taxonomy_requests the same way universities/faculties/programmes now
-- are: the real created row's id, not just its free-text code/name, so
-- an admin rejecting the request can delete the exact row it created.
ALTER TABLE taxonomy_requests
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
