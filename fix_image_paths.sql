-- Fix image paths: replace spaces with underscores, remove parentheses
-- Step 1: Fix thumbnail paths
UPDATE products SET
  thumbnail = REPLACE(REPLACE(REPLACE(REPLACE(thumbnail, 'Cwd 003', 'Cwd-003'), ' ', '_'), '(', ''), ')', '')
WHERE brand = 'YEE';

-- Step 2: Fix images JSON paths
-- We need to handle this carefully to not break JSON formatting
-- First convert to text, fix paths, then fix JSON separators back
UPDATE products SET
  images = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(images::text, 'Cwd 003', 'Cwd-003'),
            ' ', '_'
          ), '(', ''
        ), ')', ''
      ), '",_"', '", "'
    ), '[_"', '["'
  )::jsonb
WHERE brand = 'YEE';

-- Verify
SELECT id, thumbnail FROM products WHERE brand = 'YEE' AND thumbnail != '' LIMIT 5;
