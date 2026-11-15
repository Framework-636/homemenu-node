-- Starter ingredient catalog: ~100 everyday Midwestern ingredients that every
-- user shares (created_by NULL = system ingredient). Users' staples, pantry,
-- avoid list and recipes link to these by id.
--
-- Fresh and canned are deliberately separate ingredients (Tomatoes vs
-- Crushed Tomatoes) so the avoid list can block one without the other.

INSERT INTO ingredients (name, slug, category, emoji) VALUES
  -- Produce
  ('Yellow Onion',      'yellow-onion',      'Produce', '🧅'),
  ('Garlic',            'garlic',            'Produce', '🧄'),
  ('Potatoes',          'potatoes',          'Produce', '🥔'),
  ('Carrots',           'carrots',           'Produce', '🥕'),
  ('Celery',            'celery',            'Produce', '🥬'),
  ('Bell Pepper',       'bell-pepper',       'Produce', '🫑'),
  ('Tomatoes',          'tomatoes',          'Produce', '🍅'),
  ('Lettuce',           'lettuce',           'Produce', '🥬'),
  ('Broccoli',          'broccoli',          'Produce', '🥦'),
  ('Sweet Corn',        'sweet-corn',        'Produce', '🌽'),
  ('Green Beans',       'green-beans',       'Produce', '🫛'),
  ('Mushrooms',         'mushrooms',         'Produce', '🍄'),
  ('Green Onions',      'green-onions',      'Produce', '🧅'),
  ('Jalapeño',          'jalapeno',          'Produce', '🌶️'),
  ('Avocado',           'avocado',           'Produce', '🥑'),
  ('Lemon',             'lemon',             'Produce', '🍋'),
  ('Lime',              'lime',              'Produce', '🍋'),
  ('Apples',            'apples',            'Produce', '🍎'),
  ('Bananas',           'bananas',           'Produce', '🍌'),
  ('Mixed Berries',     'mixed-berries',     'Produce', '🫐'),
  ('Basil',             'basil',             'Produce', '🌿'),
  ('Cilantro',          'cilantro',          'Produce', '🌿'),

  -- Meat & Seafood
  ('Chicken Breast',    'chicken-breast',    'Meat & Seafood', '🍗'),
  ('Chicken Thighs',    'chicken-thighs',    'Meat & Seafood', '🍗'),
  ('Ground Beef',       'ground-beef',       'Meat & Seafood', '🥩'),
  ('Ground Turkey',     'ground-turkey',     'Meat & Seafood', '🦃'),
  ('Chuck Roast',       'chuck-roast',       'Meat & Seafood', '🥩'),
  ('Pork Chops',        'pork-chops',        'Meat & Seafood', '🥩'),
  ('Bacon',             'bacon',             'Meat & Seafood', '🥓'),
  ('Breakfast Sausage', 'breakfast-sausage', 'Meat & Seafood', '🌭'),
  ('Smoked Sausage',    'smoked-sausage',    'Meat & Seafood', '🌭'),
  ('Ham',               'ham',               'Meat & Seafood', '🍖'),
  ('Salmon',            'salmon',            'Meat & Seafood', '🐟'),
  ('Shrimp',            'shrimp',            'Meat & Seafood', '🦐'),

  -- Dairy & Eggs
  ('Eggs',              'eggs',              'Dairy & Eggs', '🥚'),
  ('Milk',              'milk',              'Dairy & Eggs', '🥛'),
  ('Butter',            'butter',            'Dairy & Eggs', '🧈'),
  ('Cheddar Cheese',    'cheddar-cheese',    'Dairy & Eggs', '🧀'),
  ('Mozzarella Cheese', 'mozzarella-cheese', 'Dairy & Eggs', '🧀'),
  ('Parmesan Cheese',   'parmesan-cheese',   'Dairy & Eggs', '🧀'),
  ('Sour Cream',        'sour-cream',        'Dairy & Eggs', '🥛'),
  ('Cream Cheese',      'cream-cheese',      'Dairy & Eggs', '🧀'),
  ('Heavy Cream',       'heavy-cream',       'Dairy & Eggs', '🥛'),
  ('Greek Yogurt',      'greek-yogurt',      'Dairy & Eggs', '🥛'),

  -- Bakery
  ('Sandwich Bread',    'sandwich-bread',    'Bakery', '🍞'),
  ('Hamburger Buns',    'hamburger-buns',    'Bakery', '🍔'),
  ('Flour Tortillas',   'flour-tortillas',   'Bakery', '🫓'),

  -- Pantry & Dry Goods
  ('All-Purpose Flour', 'all-purpose-flour', 'Pantry & Dry Goods', '🌾'),
  ('Sugar',             'sugar',             'Pantry & Dry Goods', '🍬'),
  ('Brown Sugar',       'brown-sugar',       'Pantry & Dry Goods', '🍬'),
  ('White Rice',        'white-rice',        'Pantry & Dry Goods', '🍚'),
  ('Spaghetti',         'spaghetti',         'Pantry & Dry Goods', '🍝'),
  ('Elbow Macaroni',    'elbow-macaroni',    'Pantry & Dry Goods', '🍝'),
  ('Egg Noodles',       'egg-noodles',       'Pantry & Dry Goods', '🍜'),
  ('Rolled Oats',       'rolled-oats',       'Pantry & Dry Goods', '🥣'),
  ('Breadcrumbs',       'breadcrumbs',       'Pantry & Dry Goods', '🍞'),
  ('Peanut Butter',     'peanut-butter',     'Pantry & Dry Goods', '🥜'),
  ('Honey',             'honey',             'Pantry & Dry Goods', '🍯'),

  -- Canned & Jarred
  ('Crushed Tomatoes',       'crushed-tomatoes',       'Canned & Jarred', '🥫'),
  ('Diced Tomatoes',         'diced-tomatoes',         'Canned & Jarred', '🥫'),
  ('Tomato Sauce',           'tomato-sauce',           'Canned & Jarred', '🥫'),
  ('Tomato Paste',           'tomato-paste',           'Canned & Jarred', '🥫'),
  ('Cream of Mushroom Soup', 'cream-of-mushroom-soup', 'Canned & Jarred', '🥫'),
  ('Cream of Chicken Soup',  'cream-of-chicken-soup',  'Canned & Jarred', '🥫'),
  ('Chicken Broth',          'chicken-broth',          'Canned & Jarred', '🥫'),
  ('Beef Broth',             'beef-broth',             'Canned & Jarred', '🥫'),
  ('Vegetable Broth',        'vegetable-broth',        'Canned & Jarred', '🥫'),
  ('Kidney Beans',           'kidney-beans',           'Canned & Jarred', '🫘'),
  ('Black Beans',            'black-beans',            'Canned & Jarred', '🫘'),
  ('Sardines',               'sardines',               'Canned & Jarred', '🐟'),

  -- Oils & Condiments
  ('Olive Oil',           'olive-oil',           'Oils & Condiments', '🫒'),
  ('Vegetable Oil',       'vegetable-oil',       'Oils & Condiments', '🫗'),
  ('Ketchup',             'ketchup',             'Oils & Condiments', '🍅'),
  ('Yellow Mustard',      'yellow-mustard',      'Oils & Condiments', '🌭'),
  ('Mayonnaise',          'mayonnaise',          'Oils & Condiments', '🥚'),
  ('BBQ Sauce',           'bbq-sauce',           'Oils & Condiments', '🍖'),
  ('Ranch Dressing',      'ranch-dressing',      'Oils & Condiments', '🥗'),
  ('Soy Sauce',           'soy-sauce',           'Oils & Condiments', '🥢'),
  ('Worcestershire Sauce','worcestershire-sauce','Oils & Condiments', '🍶'),
  ('Hot Sauce',           'hot-sauce',           'Oils & Condiments', '🌶️'),
  ('Salsa',               'salsa',               'Oils & Condiments', '🫙'),

  -- Spices & Baking
  ('Salt',              'salt',              'Spices & Baking', '🧂'),
  ('Black Pepper',      'black-pepper',      'Spices & Baking', '🧂'),
  ('Garlic Powder',     'garlic-powder',     'Spices & Baking', '🧄'),
  ('Onion Powder',      'onion-powder',      'Spices & Baking', '🧅'),
  ('Chili Powder',      'chili-powder',      'Spices & Baking', '🌶️'),
  ('Ground Cumin',      'ground-cumin',      'Spices & Baking', '🌿'),
  ('Paprika',           'paprika',           'Spices & Baking', '🌶️'),
  ('Italian Seasoning', 'italian-seasoning', 'Spices & Baking', '🌿'),
  ('Taco Seasoning',    'taco-seasoning',    'Spices & Baking', '🌮'),
  ('Fajita Seasoning',  'fajita-seasoning',  'Spices & Baking', '🌮'),
  ('Ground Cinnamon',   'ground-cinnamon',   'Spices & Baking', '🌿'),
  ('Vanilla Extract',   'vanilla-extract',   'Spices & Baking', '🍦'),
  ('Baking Soda',       'baking-soda',       'Spices & Baking', '🧂'),
  ('Baking Powder',     'baking-powder',     'Spices & Baking', '🧂'),

  -- Frozen
  ('Frozen Peas',             'frozen-peas',             'Frozen', '🫛'),
  ('Frozen Mixed Vegetables', 'frozen-mixed-vegetables', 'Frozen', '🥕'),
  ('Tater Tots',              'tater-tots',              'Frozen', '🥔'),
  ('Frozen French Fries',     'frozen-french-fries',     'Frozen', '🍟')
-- If a slug already exists, keep the existing row instead of failing.
ON DUPLICATE KEY UPDATE id = id;

-- Link existing recipe ingredient text to the catalog.
-- 'chicken breast, sliced' -> the part before the comma -> Chicken Breast.
-- Comparisons ignore case (the column collation is case-insensitive).
UPDATE recipe_ingredients ri
JOIN ingredients i
  ON i.name = TRIM(SUBSTRING_INDEX(ri.ingredient, ',', 1))
SET ri.ingredient_id = i.id
WHERE ri.ingredient_id IS NULL;

-- Demo wordings that don't match a catalog name exactly.
UPDATE recipe_ingredients SET ingredient_id = (SELECT id FROM ingredients WHERE slug = 'bell-pepper')
  WHERE ingredient_id IS NULL AND TRIM(SUBSTRING_INDEX(ingredient, ',', 1)) = 'bell peppers';
UPDATE recipe_ingredients SET ingredient_id = (SELECT id FROM ingredients WHERE slug = 'yellow-onion')
  WHERE ingredient_id IS NULL AND TRIM(SUBSTRING_INDEX(ingredient, ',', 1)) = 'onion (yellow)';
UPDATE recipe_ingredients SET ingredient_id = (SELECT id FROM ingredients WHERE slug = 'garlic')
  WHERE ingredient_id IS NULL AND TRIM(SUBSTRING_INDEX(ingredient, ',', 1)) = 'garlic cloves';
UPDATE recipe_ingredients SET ingredient_id = (SELECT id FROM ingredients WHERE slug = 'basil')
  WHERE ingredient_id IS NULL AND TRIM(SUBSTRING_INDEX(ingredient, ',', 1)) = 'fresh basil';
UPDATE recipe_ingredients SET ingredient_id = (SELECT id FROM ingredients WHERE slug = 'salmon')
  WHERE ingredient_id IS NULL AND TRIM(SUBSTRING_INDEX(ingredient, ',', 1)) = 'salmon fillets';