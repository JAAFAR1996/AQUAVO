-- Rollback for kc-wave8-articles-20260903. Deletes the four new articles.

BEGIN;

DELETE FROM blog_posts WHERE slug IN ('fish-bloating-swim-bladder-dropsy', 'aquarium-fish-aggression', 'aquarium-snail-population-control', 'nitrite-spike-aquarium', 'transporting-fish-and-aquarium', 'aquarium-plant-trimming-propagation');

COMMIT;
