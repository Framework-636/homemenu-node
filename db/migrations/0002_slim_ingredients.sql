-- Keep `ingredients` to the ingredient itself: name, slug, category, emoji.
-- Product, nutrition and quick-cook details return later as their own tables
-- when a feature needs them. Also DATETIME instead of TIMESTAMP (no 2038 limit,
-- no silent time zone conversion).

ALTER TABLE ingredients
  DROP COLUMN brand,
  DROP COLUMN product_name,
  DROP COLUMN upc,
  DROP COLUMN serving_size,
  DROP COLUMN serving_unit,
  DROP COLUMN calories,
  DROP COLUMN protein_g,
  DROP COLUMN fat_g,
  DROP COLUMN carbs_g,
  DROP COLUMN fiber_g,
  DROP COLUMN sugar_g,
  DROP COLUMN sodium_mg,
  DROP COLUMN is_verified,
  DROP COLUMN is_ready_to_eat,
  DROP COLUMN is_standalone_meal,
  DROP COLUMN is_no_prep,
  DROP COLUMN cook_method,
  DROP COLUMN cook_temp_f,
  DROP COLUMN cook_time_min,
  DROP COLUMN cook_notes,
  DROP COLUMN serving_suggestion,
  MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;