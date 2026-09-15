-- Add academic exercises/practice material as a first-class resource category.
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_category_check;

ALTER TABLE resources
    ADD CONSTRAINT resources_category_check
    CHECK (category IN ('PAST_PAPER', 'NOTES', 'SLIDES', 'ARTICLE', 'EXCEL', 'EXERCISES'));
