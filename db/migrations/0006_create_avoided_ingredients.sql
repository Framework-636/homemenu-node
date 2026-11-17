-- Ingredients a user never wants suggested (e.g. sardines, fresh tomatoes).
-- The menu engine skips any recipe that uses one of these.
-- One row per user per ingredient; the two-column primary key prevents duplicates.
CREATE TABLE avoided_ingredients (
  user_id       INT(10) UNSIGNED NOT NULL,
  ingredient_id INT(10) UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, ingredient_id),
  KEY idx_avoid_ingredient (ingredient_id),
  CONSTRAINT fk_avoid_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_avoid_ingredient FOREIGN KEY (ingredient_id)
    REFERENCES ingredients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;