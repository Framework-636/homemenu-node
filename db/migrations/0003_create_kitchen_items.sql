-- One table for everything in a user's kitchen: staples (always kept) and
-- pantry items (rotating). One row per user + ingredient.

CREATE TABLE kitchen_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  kind ENUM('staple', 'pantry') NOT NULL DEFAULT 'staple',
  in_stock TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  quantity VARCHAR(40) DEFAULT NULL COMMENT 'e.g. 2 lbs, half a bag',
  expires_on DATE DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_kitchen_user_ingredient (user_id, ingredient_id),
  KEY idx_kitchen_ingredient (ingredient_id),
  CONSTRAINT fk_kitchen_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_kitchen_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;