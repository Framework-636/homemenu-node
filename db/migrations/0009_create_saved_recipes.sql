-- Bookmarks: someone else's public recipe that a user wants to keep handy.
-- One row per user per recipe; the two-column primary key prevents duplicates.
CREATE TABLE saved_recipes (
  user_id    INT(10) UNSIGNED NOT NULL,
  recipe_id  INT(10) UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, recipe_id),
  KEY idx_saved_recipe (recipe_id),
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_recipe FOREIGN KEY (recipe_id)
    REFERENCES recipes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
