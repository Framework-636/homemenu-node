-- Whether an account may make recipes public.
-- The demo account is shared by everyone who tries the site, so anything a
-- visitor types into it must never be shown to other people. With this off,
-- recipes saved by that account are always stored as private.
ALTER TABLE users
  ADD COLUMN can_publish TINYINT(1) NOT NULL DEFAULT 1 AFTER default_visibility;

UPDATE users SET can_publish = 0, default_visibility = 'private' WHERE username = 'demo';
