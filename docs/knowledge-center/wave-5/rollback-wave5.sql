-- Rollback for kc-wave5-articles-20260902. Deletes the four new articles.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('aquarium-fish-feeding-guide', 'fish-fungus-vs-columnaris', 'aquarium-airborne-toxins', 'why-fish-jump-out-aquarium');

COMMIT;
