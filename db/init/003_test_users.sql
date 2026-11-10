-- Extra accounts for automated tests and local development ONLY.
-- Never loaded in production (production loads 001 and 002).
--   neighbor / demo-password   owns recipe 6 (private): proves users can't see each other's private recipes
--   writer   / demo-password   owns nothing: the create/update/delete tests use it

SET NAMES utf8mb4;

INSERT INTO users (id, username, display_name, email, password_hash, role, default_visibility) VALUES
  (2, 'neighbor', 'Nosy Neighbor', 'neighbor@example.com', '$2b$12$yaeYdeuJnA93X175H2jsfeJbWgh6/IBEqTpK9QDEPo0s3E8ioqZVy', 'user', 'private'),
  (3, 'writer',   'Test Writer',   'writer@example.com',   '$2b$12$yaeYdeuJnA93X175H2jsfeJbWgh6/IBEqTpK9QDEPo0s3E8ioqZVy', 'user', 'private');

INSERT INTO recipes (id, user_id, name, emoji, category, servings, prep_time, cook_time, description, visibility, season) VALUES
  (6, 2, 'Neighbor''s Secret Salsa', '🌶️', 'Snack', 4, 10, 0, 'Belongs to another user; demo must never see it.', 'private', 'summer');