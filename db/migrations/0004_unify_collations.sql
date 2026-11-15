-- Every table now uses utf8mb4_unicode_ci; ai_rate_limit was the last one on
-- utf8mb4_general_ci. Mixed collations cause "illegal mix of collations" errors
-- when text columns are compared across tables. (#17)
ALTER TABLE ai_rate_limit CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;