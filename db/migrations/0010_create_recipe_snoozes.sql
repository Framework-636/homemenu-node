-- "Not this week": hide a recipe from a user's menu suggestions until a date.
-- One row per user per recipe; snoozing again just moves the date.
-- A snooze that has passed is ignored by the menu, so nothing needs cleaning up.
CREATE TABLE recipe_snoozes (
  user_id       INT(10) UNSIGNED NOT NULL,
  recipe_id     INT(10) UNSIGNED NOT NULL,
  snoozed_until DATE NOT NULL COMMENT 'first day the recipe may be suggested again',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, recipe_id),
  KEY idx_snooze_recipe (recipe_id),
  CONSTRAINT fk_snooze_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_snooze_recipe FOREIGN KEY (recipe_id)
    REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
