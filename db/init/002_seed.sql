-- Demo data for local development and review.
-- All content is fictional and safe to commit.

SET NAMES utf8mb4;

-- Demo user. The password_hash '!' can never match a real password,
-- so this account can't log in until authentication is added (#7).
INSERT INTO users (id, username, display_name, email, password_hash, role, default_visibility)
VALUES (1, 'demo', 'Demo Cook', 'demo@example.com', '!', 'user', 'public');

INSERT INTO recipes (id, user_id, name, emoji, category, servings, prep_time, cook_time, description, visibility, season) VALUES
  (1, 1, 'Sheet Pan Chicken Fajitas', '🌮', 'Dinner',    4, 15, 25, 'Peppers, onions and chicken roasted on one pan.',     'public',  'any'),
  (2, 1, 'Overnight Oats',            '🥣', 'Breakfast', 2,  5,  0, 'Make it the night before and grab it in the morning.', 'public',  'any'),
  (3, 1, 'Tomato Basil Soup',         '🍅', 'Soup',      4, 10, 30, 'Simple, cozy and freezer-friendly.',                  'public',  'fall'),
  (4, 1, 'Grilled Lemon Salmon',      '🐟', 'Dinner',    2, 10, 12, 'Quick weeknight salmon with a bright lemon finish.',  'public',  'summer'),
  (5, 1, 'Secret Family Chili',       '🍲', 'Dinner',    6, 20, 90, 'Private recipe used to test visibility filtering.',   'private', 'winter');

INSERT INTO recipe_ingredients (recipe_id, sort_order, quantity, unit, ingredient) VALUES
  (1, 1, '1.5', 'lb',   'chicken breast, sliced'),
  (1, 2, '3',   '',     'bell peppers, sliced'),
  (1, 3, '1',   '',     'onion (yellow), sliced'),
  (1, 4, '2',   'tbsp', 'olive oil'),
  (1, 5, '1',   'tbsp', 'fajita seasoning'),
  (1, 6, '8',   '',     'flour tortillas'),
  (2, 1, '1',   'cup',  'rolled oats'),
  (2, 2, '1',   'cup',  'milk'),
  (2, 3, '0.5', 'cup',  'Greek yogurt'),
  (2, 4, '1',   'tbsp', 'honey'),
  (2, 5, '0.5', 'cup',  'mixed berries'),
  (3, 1, '2',   'tbsp', 'butter'),
  (3, 2, '1',   '',     'onion (yellow), diced'),
  (3, 3, '2',   '',     'garlic cloves, minced'),
  (3, 4, '28',  'oz',   'crushed tomatoes'),
  (3, 5, '2',   'cup',  'vegetable broth'),
  (3, 6, '0.25','cup',  'fresh basil, chopped'),
  (4, 1, '2',   '',     'salmon fillets'),
  (4, 2, '1',   'tbsp', 'olive oil'),
  (4, 3, '1',   '',     'lemon'),
  (4, 4, '0.5', 'tsp',  'salt'),
  (5, 1, '2',   'lb',   'ground beef'),
  (5, 2, '2',   'can',  'kidney beans, drained'),
  (5, 3, '2',   'tbsp', 'chili powder');

INSERT INTO recipe_instructions (recipe_id, step_number, instruction) VALUES
  (1, 1, 'Heat the oven to 425°F.'),
  (1, 2, 'Toss chicken, peppers and onion with oil and seasoning on a sheet pan.'),
  (1, 3, 'Roast 20–25 minutes until the chicken is cooked through. Serve in warm tortillas.'),
  (2, 1, 'Stir oats, milk, yogurt and honey together in a jar.'),
  (2, 2, 'Refrigerate overnight. Top with berries before serving.'),
  (3, 1, 'Melt butter in a pot and cook the onion and garlic until soft.'),
  (3, 2, 'Add tomatoes and broth, then simmer for 20 minutes.'),
  (3, 3, 'Blend until smooth and stir in the basil.'),
  (4, 1, 'Brush salmon with oil and season with salt.'),
  (4, 2, 'Grill 5–6 minutes per side and finish with fresh lemon juice.'),
  (5, 1, 'Brown the beef, then add beans and chili powder.'),
  (5, 2, 'Simmer low and slow for 90 minutes.');

INSERT INTO recipe_tags (recipe_id, tag) VALUES
  (1, 'one-pan'), (1, 'weeknight'),
  (2, 'make-ahead'), (2, 'no-cook'),
  (3, 'freezer-friendly'), (3, 'vegetarian'),
  (4, 'quick'), (4, 'grill'),
  (5, 'slow-cook');