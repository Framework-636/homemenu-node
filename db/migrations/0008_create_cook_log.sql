-- "We made this": one row each time a user cooks a recipe.
-- A recipe's "last made" date is per user, read from here (the newest cooked_on),
-- so two households cooking the same public recipe never overwrite each other.
-- One row per user, recipe and day: tapping twice on the same night changes nothing.
CREATE TABLE cook_log (
  id         INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT(10) UNSIGNED NOT NULL,
  recipe_id  INT(10) UNSIGNED NOT NULL,
  cooked_on  DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cook_user_recipe_day (user_id, recipe_id, cooked_on),
  KEY idx_cook_recipe (recipe_id),
  CONSTRAINT fk_cook_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_cook_recipe FOREIGN KEY (recipe_id)
    REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
