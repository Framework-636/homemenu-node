-- Grocery list v2.
-- The list = out-of-stock staples (calculated from kitchen_items, not stored here)
--          + grocery_items (manual items and missing recipe ingredients).
--
-- grocery_items: drop the old checkbox/source columns; link optionally to a catalog
-- ingredient and to the recipe it's for; record "couldn't find it" as a date.
ALTER TABLE grocery_items
  DROP COLUMN is_checked,
  DROP COLUMN source,
  ADD COLUMN ingredient_id INT(10) UNSIGNED NULL AFTER user_id,
  ADD COLUMN recipe_id INT(10) UNSIGNED NULL AFTER ingredient_id,
  ADD COLUMN not_found_on DATE NULL AFTER category,
  ADD CONSTRAINT fk_grocery_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_grocery_recipe FOREIGN KEY (recipe_id)
    REFERENCES recipes (id) ON DELETE SET NULL;

-- Staples can be "couldn't find it" too.
ALTER TABLE kitchen_items
  ADD COLUMN not_found_on DATE NULL AFTER in_stock;