-- A stable name for each recipe that belongs to the demo data set.
-- The nightly demo reset finds its recipes by this key, so it can restore one a
-- visitor edited without deleting it (which would drop other users' bookmarks
-- and cook logs for it). Recipes people create themselves have no key.
ALTER TABLE recipes
  ADD COLUMN seed_key VARCHAR(60) NULL AFTER user_id,
  ADD UNIQUE KEY uq_recipe_seed_key (seed_key);

-- Tag the five original demo recipes (user 1 is the demo account).
UPDATE recipes SET seed_key = 'sheet-pan-chicken-fajitas'
  WHERE user_id = 1 AND name = 'Sheet Pan Chicken Fajitas';
UPDATE recipes SET seed_key = 'overnight-oats'
  WHERE user_id = 1 AND name = 'Overnight Oats';
UPDATE recipes SET seed_key = 'tomato-basil-soup'
  WHERE user_id = 1 AND name = 'Tomato Basil Soup';
UPDATE recipes SET seed_key = 'grilled-lemon-salmon'
  WHERE user_id = 1 AND name = 'Grilled Lemon Salmon';
UPDATE recipes SET seed_key = 'secret-family-chili'
  WHERE user_id = 1 AND name = 'Secret Family Chili';
