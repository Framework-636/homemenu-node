/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
DROP TABLE IF EXISTS `ai_rate_limit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_rate_limit` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `called_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`,`called_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `grocery_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `grocery_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'General',
  `is_checked` tinyint(1) NOT NULL DEFAULT 0,
  `source` varchar(80) NOT NULL DEFAULT 'manual' COMMENT 'manual | meal_plan | recipe:<id>',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_grocery_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL COMMENT 'General name, e.g. Chicken Thighs',
  `slug` varchar(140) NOT NULL COMMENT 'URL-safe unique key',
  `category` varchar(60) NOT NULL DEFAULT 'Other',
  `emoji` varchar(8) NOT NULL DEFAULT '?',
  `brand` varchar(80) DEFAULT NULL COMMENT 'e.g. Tyson, Heinz — NULL = generic',
  `product_name` varchar(160) DEFAULT NULL COMMENT 'e.g. Fresh Chicken Thighs 3lb Family Pack',
  `upc` varchar(20) DEFAULT NULL COMMENT 'For future barcode scanning',
  `serving_size` decimal(8,2) DEFAULT NULL COMMENT 'e.g. 100, 3, 0.5',
  `serving_unit` varchar(20) DEFAULT NULL COMMENT 'e.g. g, oz, cup, tbsp, piece',
  `calories` decimal(8,1) DEFAULT NULL,
  `protein_g` decimal(8,2) DEFAULT NULL,
  `fat_g` decimal(8,2) DEFAULT NULL,
  `carbs_g` decimal(8,2) DEFAULT NULL,
  `fiber_g` decimal(8,2) DEFAULT NULL,
  `sugar_g` decimal(8,2) DEFAULT NULL,
  `sodium_mg` decimal(8,1) DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL COMMENT 'NULL = system/admin. User ID = private ingredient',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = admin verified nutrition data',
  `is_ready_to_eat` tinyint(1) NOT NULL DEFAULT 0,
  `is_standalone_meal` tinyint(1) NOT NULL DEFAULT 0,
  `is_no_prep` tinyint(1) NOT NULL DEFAULT 0,
  `cook_method` varchar(20) DEFAULT NULL,
  `cook_temp_f` smallint(5) unsigned DEFAULT NULL,
  `cook_time_min` tinyint(3) unsigned DEFAULT NULL,
  `cook_notes` varchar(200) DEFAULT NULL,
  `serving_suggestion` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_slug` (`slug`),
  KEY `idx_category` (`category`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_name` (`name`),
  CONSTRAINT `fk_ing_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `master_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `master_ingredients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `category` varchar(60) NOT NULL DEFAULT 'Pantry & Dry Goods',
  `emoji` varchar(8) NOT NULL DEFAULT '?',
  `created_by` int(10) unsigned DEFAULT NULL COMMENT 'NULL = system/preloaded',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_name` (`name`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `meal_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `meal_plan` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `plan_date` date NOT NULL,
  `meal_type` enum('Breakfast','Lunch','Dinner','Snack') NOT NULL DEFAULT 'Dinner',
  `recipe_id` int(10) unsigned DEFAULT NULL COMMENT 'NULL = free-text entry',
  `note` varchar(200) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`plan_date`),
  KEY `fk_mp_recipe` (`recipe_id`),
  CONSTRAINT `fk_mp_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_ingredients` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `recipe_id` int(10) unsigned NOT NULL,
  `sort_order` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `quantity` varchar(30) NOT NULL DEFAULT '',
  `unit` varchar(30) NOT NULL DEFAULT '',
  `ingredient` varchar(160) NOT NULL,
  `ingredient_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recipe` (`recipe_id`),
  KEY `fk_ri_ingredient` (`ingredient_id`),
  CONSTRAINT `fk_ing_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ri_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recipe_instructions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_instructions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `recipe_id` int(10) unsigned NOT NULL,
  `step_number` tinyint(3) unsigned NOT NULL,
  `instruction` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recipe` (`recipe_id`),
  CONSTRAINT `fk_inst_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recipe_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_tags` (
  `recipe_id` int(10) unsigned NOT NULL,
  `tag` varchar(60) NOT NULL,
  PRIMARY KEY (`recipe_id`,`tag`),
  CONSTRAINT `fk_tag_recipe` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(160) NOT NULL,
  `emoji` varchar(8) NOT NULL DEFAULT '?',
  `category` enum('Dinner','Lunch','Breakfast','Dessert','Snack','Soup','Baking','Other') NOT NULL DEFAULT 'Dinner',
  `servings` tinyint(3) unsigned NOT NULL DEFAULT 4,
  `prep_time` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'minutes',
  `cook_time` smallint(5) unsigned NOT NULL DEFAULT 0 COMMENT 'minutes',
  `description` text DEFAULT NULL,
  `visibility` enum('private','public') NOT NULL DEFAULT 'private',
  `season` enum('any','spring','summer','fall','winter') NOT NULL DEFAULT 'any',
  `last_made` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_visibility` (`visibility`),
  CONSTRAINT `fk_recipe_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(64) NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `ip` varchar(45) NOT NULL DEFAULT '',
  `user_agent` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_sess_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_ingredient_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_ingredient_overrides` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `ingredient_id` int(10) unsigned NOT NULL,
  `custom_name` varchar(180) DEFAULT NULL,
  `personal_notes` varchar(500) DEFAULT NULL,
  `is_ready_to_eat` tinyint(1) DEFAULT NULL,
  `is_standalone_meal` tinyint(1) DEFAULT NULL,
  `is_no_prep` tinyint(1) DEFAULT NULL,
  `cook_method` varchar(20) DEFAULT NULL,
  `cook_temp_f` smallint(5) unsigned DEFAULT NULL,
  `cook_time_min` tinyint(3) unsigned DEFAULT NULL,
  `cook_notes` varchar(200) DEFAULT NULL,
  `serving_suggestion` varchar(120) DEFAULT NULL,
  `serving_size` decimal(8,2) DEFAULT NULL,
  `serving_unit` varchar(30) DEFAULT NULL,
  `calories` smallint(5) unsigned DEFAULT NULL,
  `protein_g` decimal(6,2) DEFAULT NULL,
  `fat_g` decimal(6,2) DEFAULT NULL,
  `carbs_g` decimal(6,2) DEFAULT NULL,
  `fiber_g` decimal(6,2) DEFAULT NULL,
  `sugar_g` decimal(6,2) DEFAULT NULL,
  `sodium_mg` smallint(5) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_ingredient` (`user_id`,`ingredient_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_ingredient` (`ingredient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_pantry`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_pantry` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `ingredient_id` int(10) unsigned NOT NULL,
  `quantity` varchar(40) DEFAULT NULL COMMENT 'e.g. 2 lbs, half a bag, 3',
  `is_out` tinyint(1) NOT NULL DEFAULT 0,
  `expires_on` date DEFAULT NULL COMMENT 'Optional expiry tracking',
  `notes` varchar(200) DEFAULT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_pantry` (`user_id`,`ingredient_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `fk_pantry_ing` (`ingredient_id`),
  CONSTRAINT `fk_pantry_ing` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pantry_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_staples`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_staples` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `ingredient_id` int(10) unsigned NOT NULL,
  `is_out` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = marked out of stock',
  `notes` varchar(200) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_staple` (`user_id`,`ingredient_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `fk_staple_ing` (`ingredient_id`),
  CONSTRAINT `fk_staple_ing` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staple_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(40) NOT NULL,
  `display_name` varchar(80) NOT NULL,
  `email` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `default_visibility` enum('private','public') NOT NULL DEFAULT 'private',
  `share_real_name` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_login` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `v_unlinked_pantry`;
/*!50001 DROP VIEW IF EXISTS `v_unlinked_pantry`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `v_unlinked_pantry` AS SELECT
 NULL AS `pantry_type`,
 NULL AS `id`,
 NULL AS `user_id`,
 NULL AS `quantity`,
 NULL AS `expires_on` */;
SET character_set_client = @saved_cs_client;
/*!50001 DROP VIEW IF EXISTS `v_unlinked_pantry`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_uca1400_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY INVOKER */
/*!50001 VIEW `v_unlinked_pantry` AS select 'staple' AS `pantry_type`,`user_staples`.`id` AS `id`,`user_staples`.`user_id` AS `user_id`,NULL AS `quantity`,NULL AS `expires_on` from `user_staples` where `user_staples`.`ingredient_id` is null union all select 'pantry' AS `pantry_type`,`user_pantry`.`id` AS `id`,`user_pantry`.`user_id` AS `user_id`,`user_pantry`.`quantity` AS `quantity`,`user_pantry`.`expires_on` AS `expires_on` from `user_pantry` where `user_pantry`.`ingredient_id` is null */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

