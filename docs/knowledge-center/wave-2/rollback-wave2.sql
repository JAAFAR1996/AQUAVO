-- Rollback for kc-wave2-articles-20260902. Deletes the four new articles.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('acclimating-new-fish', 'aquarium-test-kit-guide', 'gh-kh-water-hardness-guide', 'aquarium-salt-guide');

COMMIT;
