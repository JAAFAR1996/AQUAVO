-- AQUAVO database repair: canonical category taxonomy
-- Date: 2026-07-22
-- Existing category IDs/slugs remain unchanged to avoid breaking URLs.

CREATE TABLE IF NOT EXISTS canonical_categories (
  key text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_categories_key_check
    CHECK (key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT canonical_categories_slug_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS category_canonical_mappings (
  category_id text PRIMARY KEY REFERENCES categories(id),
  canonical_key text NOT NULL REFERENCES canonical_categories(key),
  mapping_reason text NOT NULL,
  confidence numeric NOT NULL DEFAULT 1,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_mapping_confidence_check
    CHECK (confidence>=0 AND confidence<=1)
);

CREATE INDEX IF NOT EXISTS category_canonical_mappings_key_idx
  ON category_canonical_mappings(canonical_key);

INSERT INTO canonical_categories
  (key,slug,display_name_ar,display_name_en,sort_order)
VALUES
  ('aquariums','aquariums','أحواض','Aquariums',10),
  ('filtration','filtration','الفلترة والتنقية','Filtration',20),
  ('aeration','aeration','التهوية والأكسجين','Aeration & Oxygen',30),
  ('water-treatment','water-treatment','معالجة المياه','Water Treatment',40),
  ('fish-food','fish-food','طعام الأسماك','Fish Food',50),
  ('temperature-control','temperature-control','التحكم بالحرارة','Temperature Control',60),
  ('testing-monitoring','testing-monitoring','الفحص والمراقبة','Testing & Monitoring',70),
  ('substrates','substrates','التربة والركائز','Substrates',80),
  ('decor','decor','الديكور','Decor',90),
  ('maintenance-cleaning','maintenance-cleaning','الصيانة والتنظيف','Maintenance & Cleaning',100),
  ('tools','tools','الأدوات','Tools',110),
  ('pumps','pumps','مضخات المياه','Water Pumps',120),
  ('breeding-isolation','breeding-isolation','التفريخ والعزل','Breeding & Isolation',130),
  ('lighting','lighting','الإضاءة','Lighting',140),
  ('accessories','accessories','الملحقات والمستلزمات','Accessories',150)
ON CONFLICT (key) DO UPDATE SET
  slug=EXCLUDED.slug,
  display_name_ar=EXCLUDED.display_name_ar,
  display_name_en=EXCLUDED.display_name_en,
  sort_order=EXCLUDED.sort_order,
  updated_at=now();

INSERT INTO category_canonical_mappings
  (category_id,canonical_key,mapping_reason,confidence)
SELECT
  c.id,
  CASE c.name
    WHEN 'أحواض' THEN 'aquariums'
    WHEN 'الفلترة والتنقية' THEN 'filtration'
    WHEN 'filters' THEN 'filtration'
    WHEN 'Filter media' THEN 'filtration'
    WHEN 'التهوية والأكسجين' THEN 'aeration'
    WHEN 'air-pumps' THEN 'aeration'
    WHEN 'معالجة المياه' THEN 'water-treatment'
    WHEN 'طعام الأسماك' THEN 'fish-food'
    WHEN 'التحكم بالحرارة' THEN 'temperature-control'
    WHEN 'الفحص والمراقبة' THEN 'testing-monitoring'
    WHEN 'measurement' THEN 'testing-monitoring'
    WHEN 'substrates' THEN 'substrates'
    WHEN 'التربة والديكور' THEN 'substrates'
    WHEN 'decor' THEN 'decor'
    WHEN 'الصيانة والتنظيف' THEN 'maintenance-cleaning'
    WHEN 'maintenance/cleaning' THEN 'maintenance-cleaning'
    WHEN 'tools' THEN 'tools'
    WHEN 'pumps' THEN 'pumps'
    WHEN 'التفريخ والعزل' THEN 'breeding-isolation'
    WHEN 'الإضاءة' THEN 'lighting'
    WHEN 'accessories' THEN 'accessories'
    WHEN 'ملحقات ومستلزمات' THEN 'accessories'
    ELSE NULL
  END,
  'Normalized from the legacy category name without changing its public ID or slug.',
  1
FROM categories c
WHERE CASE c.name
    WHEN 'أحواض' THEN 'aquariums'
    WHEN 'الفلترة والتنقية' THEN 'filtration'
    WHEN 'filters' THEN 'filtration'
    WHEN 'Filter media' THEN 'filtration'
    WHEN 'التهوية والأكسجين' THEN 'aeration'
    WHEN 'air-pumps' THEN 'aeration'
    WHEN 'معالجة المياه' THEN 'water-treatment'
    WHEN 'طعام الأسماك' THEN 'fish-food'
    WHEN 'التحكم بالحرارة' THEN 'temperature-control'
    WHEN 'الفحص والمراقبة' THEN 'testing-monitoring'
    WHEN 'measurement' THEN 'testing-monitoring'
    WHEN 'substrates' THEN 'substrates'
    WHEN 'التربة والديكور' THEN 'substrates'
    WHEN 'decor' THEN 'decor'
    WHEN 'الصيانة والتنظيف' THEN 'maintenance-cleaning'
    WHEN 'maintenance/cleaning' THEN 'maintenance-cleaning'
    WHEN 'tools' THEN 'tools'
    WHEN 'pumps' THEN 'pumps'
    WHEN 'التفريخ والعزل' THEN 'breeding-isolation'
    WHEN 'الإضاءة' THEN 'lighting'
    WHEN 'accessories' THEN 'accessories'
    WHEN 'ملحقات ومستلزمات' THEN 'accessories'
    ELSE NULL
  END IS NOT NULL
ON CONFLICT (category_id) DO UPDATE SET
  canonical_key=EXCLUDED.canonical_key,
  mapping_reason=EXCLUDED.mapping_reason,
  confidence=EXCLUDED.confidence,
  updated_at=now();

CREATE OR REPLACE VIEW products_with_canonical_category AS
SELECT
  p.*,
  cc.key AS canonical_category_key,
  cc.slug AS canonical_category_slug,
  cc.display_name_ar AS canonical_category_name_ar,
  cc.display_name_en AS canonical_category_name_en
FROM products p
LEFT JOIN category_canonical_mappings cm ON cm.category_id=p.category_id
LEFT JOIN canonical_categories cc ON cc.key=cm.canonical_key;

INSERT INTO database_repair_findings (
  finding_code,severity,domain,entity_type,entity_id,status,
  observed_value,evidence
)
SELECT
  'UNMAPPED-CATEGORY','medium','catalog','category',c.id,'open',
  jsonb_build_object('name',c.name,'slug',c.slug),
  jsonb_build_object('reason','No canonical category mapping was generated')
FROM categories c
LEFT JOIN category_canonical_mappings cm ON cm.category_id=c.id
WHERE cm.category_id IS NULL
ON CONFLICT (finding_code,entity_type,entity_id) DO NOTHING;
