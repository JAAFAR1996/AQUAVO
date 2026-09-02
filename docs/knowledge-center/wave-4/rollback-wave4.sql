-- Rollback for kc-wave4-articles-20260902. Deletes the four new articles.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('aquarium-shrimp-snails-guide', 'schooling-fish-minimum-numbers', 'aquarium-care-while-traveling', 'how-to-sex-aquarium-fish');

COMMIT;
