-- Remove the old pantry/staples tables and leftovers. All are empty.
-- The view goes first, because it reads from user_staples and user_pantry.

-- Always returned nothing: it filters on ingredient_id IS NULL, but both
-- source tables declare ingredient_id NOT NULL. (#16)
DROP VIEW IF EXISTS v_unlinked_pantry;

-- Duplicate of `ingredients`.
DROP TABLE IF EXISTS master_ingredients;

-- Mirrored nearly every ingredients column; unused. Also the second table
-- with the wrong collation and no foreign keys. (#17)
DROP TABLE IF EXISTS user_ingredient_overrides;

-- Replaced by kitchen_items (0003).
DROP TABLE IF EXISTS user_staples;
DROP TABLE IF EXISTS user_pantry;