// What the demo account looks like after a reset. All of it is fictional.
//
// BASELINE is the five recipes every fresh database starts with (db/init/002_seed.sql),
// all owned by the demo account; the automated tests count on exactly that.
// FULL and KITCHEN are the live demo: a library of public recipes, and one household
// (the demo account) with staples and a cooking history, so every menu has something on it.
import type { SeedData, SeedRecipe } from './reset.ts';

// [quantity, unit, ingredient as written, catalog slug it links to (optional)]
type Line = [string, string, string, string?];

function recipe(
  fields: Omit<SeedRecipe, 'ingredients' | 'visibility' | 'season'> & {
    visibility?: SeedRecipe['visibility'];
    season?: SeedRecipe['season'];
    ingredients: Line[];
  }
): SeedRecipe {
  return {
    visibility: 'public',
    season: 'any',
    ...fields,
    ingredients: fields.ingredients.map(([quantity, unit, ingredient, slug]) => ({
      quantity,
      unit,
      ingredient,
      slug,
    })),
  };
}

// ---------- The five original recipes ----------

const fajitas = recipe({
  key: 'sheet-pan-chicken-fajitas',
  name: 'Sheet Pan Chicken Fajitas',
  emoji: '🌮',
  category: 'Dinner',
  servings: 4,
  prep_time: 15,
  cook_time: 25,
  description: 'Peppers, onions and chicken roasted on one pan.',
  tags: ['one-pan', 'weeknight'],
  ingredients: [
    ['1.5', 'lb', 'chicken breast, sliced', 'chicken-breast'],
    ['3', '', 'bell peppers, sliced', 'bell-pepper'],
    ['1', '', 'onion (yellow), sliced', 'yellow-onion'],
    ['2', 'tbsp', 'olive oil', 'olive-oil'],
    ['1', 'tbsp', 'fajita seasoning', 'fajita-seasoning'],
    ['8', '', 'flour tortillas', 'flour-tortillas'],
  ],
  steps: [
    'Heat the oven to 425°F.',
    'Toss chicken, peppers and onion with oil and seasoning on a sheet pan.',
    'Roast 20–25 minutes until the chicken is cooked through. Serve in warm tortillas.',
  ],
});

const oats = recipe({
  key: 'overnight-oats',
  name: 'Overnight Oats',
  emoji: '🥣',
  category: 'Breakfast',
  servings: 2,
  prep_time: 5,
  cook_time: 0,
  description: 'Make it the night before and grab it in the morning.',
  tags: ['make-ahead', 'no-cook'],
  ingredients: [
    ['1', 'cup', 'rolled oats', 'rolled-oats'],
    ['1', 'cup', 'milk', 'milk'],
    ['0.5', 'cup', 'Greek yogurt', 'greek-yogurt'],
    ['1', 'tbsp', 'honey', 'honey'],
    ['0.5', 'cup', 'mixed berries', 'mixed-berries'],
  ],
  steps: [
    'Stir oats, milk, yogurt and honey together in a jar.',
    'Refrigerate overnight. Top with berries before serving.',
  ],
});

const soup = recipe({
  key: 'tomato-basil-soup',
  name: 'Tomato Basil Soup',
  emoji: '🍅',
  category: 'Soup',
  servings: 4,
  prep_time: 10,
  cook_time: 30,
  description: 'Simple, cozy and freezer-friendly.',
  season: 'fall',
  tags: ['freezer-friendly', 'vegetarian'],
  ingredients: [
    ['2', 'tbsp', 'butter', 'butter'],
    ['1', '', 'onion (yellow), diced', 'yellow-onion'],
    ['2', '', 'garlic cloves, minced', 'garlic'],
    ['28', 'oz', 'crushed tomatoes', 'crushed-tomatoes'],
    ['2', 'cup', 'vegetable broth', 'vegetable-broth'],
    ['0.25', 'cup', 'fresh basil, chopped', 'basil'],
  ],
  steps: [
    'Melt butter in a pot and cook the onion and garlic until soft.',
    'Add tomatoes and broth, then simmer for 20 minutes.',
    'Blend until smooth and stir in the basil.',
  ],
});

const salmon = recipe({
  key: 'grilled-lemon-salmon',
  name: 'Grilled Lemon Salmon',
  emoji: '🐟',
  category: 'Dinner',
  servings: 2,
  prep_time: 10,
  cook_time: 12,
  description: 'Quick weeknight salmon with a bright lemon finish.',
  season: 'summer',
  tags: ['grill', 'quick'],
  ingredients: [
    ['2', '', 'salmon fillets', 'salmon'],
    ['1', 'tbsp', 'olive oil', 'olive-oil'],
    ['1', '', 'lemon', 'lemon'],
    ['0.5', 'tsp', 'salt', 'salt'],
  ],
  steps: [
    'Brush salmon with oil and season with salt.',
    'Grill 5–6 minutes per side and finish with fresh lemon juice.',
  ],
});

const chili = recipe({
  key: 'secret-family-chili',
  name: 'Secret Family Chili',
  emoji: '🍲',
  category: 'Dinner',
  servings: 6,
  prep_time: 20,
  cook_time: 90,
  description: 'Private recipe used to test visibility filtering.',
  visibility: 'private',
  season: 'winter',
  tags: ['slow-cook'],
  ingredients: [
    ['2', 'lb', 'ground beef', 'ground-beef'],
    ['2', 'can', 'kidney beans, drained', 'kidney-beans'],
    ['2', 'tbsp', 'chili powder', 'chili-powder'],
  ],
  steps: [
    'Brown the beef, then add beans and chili powder.',
    'Simmer low and slow for 90 minutes.',
  ],
});

export const BASELINE: SeedData = {
  recipes: [fajitas, oats, soup, salmon, chili],
  staples: [],
  avoids: [],
  grocery: [],
  cooked: [],
  saved: [],
};

// An account with nothing in it.
export const EMPTY: SeedData = {
  recipes: [],
  staples: [],
  avoids: [],
  grocery: [],
  cooked: [],
  saved: [],
};

// ---------- The fuller demo ----------

// Everyday recipes. The demo cook makes these regularly.
const everyday: SeedRecipe[] = [
  recipe({
    key: 'spaghetti-meat-sauce',
    name: 'Spaghetti with Meat Sauce',
    emoji: '🍝',
    category: 'Dinner',
    servings: 4,
    prep_time: 10,
    cook_time: 30,
    description: 'The weeknight standby.',
    tags: ['weeknight', 'kid-friendly'],
    ingredients: [
      ['12', 'oz', 'spaghetti', 'spaghetti'],
      ['1', 'lb', 'ground beef', 'ground-beef'],
      ['1', '', 'yellow onion, diced', 'yellow-onion'],
      ['2', '', 'garlic cloves, minced', 'garlic'],
      ['2', 'can', 'tomato sauce (15 oz each)', 'tomato-sauce'],
      ['2', 'tsp', 'Italian seasoning', 'italian-seasoning'],
      ['', '', 'grated parmesan, to serve', 'parmesan-cheese'],
    ],
    steps: [
      'Brown the beef with the onion in a large pan, then drain.',
      'Add garlic, tomato sauce and Italian seasoning. Simmer 20 minutes.',
      'Meanwhile, cook the spaghetti according to the package and drain.',
      'Serve the sauce over the spaghetti with parmesan.',
    ],
  }),
  recipe({
    key: 'turkey-taco-night',
    name: 'Turkey Taco Night',
    emoji: '🌮',
    category: 'Dinner',
    servings: 4,
    prep_time: 10,
    cook_time: 15,
    description: 'Everyone builds their own.',
    tags: ['weeknight', 'quick'],
    ingredients: [
      ['1', 'lb', 'ground turkey', 'ground-turkey'],
      ['1', 'packet', 'taco seasoning', 'taco-seasoning'],
      ['8', '', 'flour tortillas', 'flour-tortillas'],
      ['2', 'cup', 'shredded lettuce', 'lettuce'],
      ['1', 'cup', 'shredded cheddar cheese', 'cheddar-cheese'],
      ['', '', 'salsa and sour cream, to serve', 'salsa'],
    ],
    steps: [
      'Brown the turkey in a skillet, breaking it up as it cooks.',
      'Add the taco seasoning and water as the packet directs. Simmer 5 minutes.',
      'Warm the tortillas and set out the toppings.',
    ],
  }),
  recipe({
    key: 'one-pot-beef-macaroni',
    name: 'One-Pot Beef & Macaroni',
    emoji: '🥘',
    category: 'Dinner',
    servings: 6,
    prep_time: 10,
    cook_time: 25,
    description: 'One pot, no draining the pasta.',
    tags: ['one-pot', 'kid-friendly'],
    ingredients: [
      ['1', 'lb', 'ground beef', 'ground-beef'],
      ['1', '', 'yellow onion, diced', 'yellow-onion'],
      ['2', '', 'garlic cloves, minced', 'garlic'],
      ['1', 'can', 'diced tomatoes (15 oz)', 'diced-tomatoes'],
      ['2', 'cup', 'beef broth', 'beef-broth'],
      ['2', 'cup', 'elbow macaroni', 'elbow-macaroni'],
      ['1', 'cup', 'shredded cheddar cheese', 'cheddar-cheese'],
    ],
    steps: [
      'Brown the beef with the onion in a large pot, then drain.',
      'Stir in the garlic, tomatoes, broth and macaroni. Bring to a boil.',
      'Cover and simmer 12–15 minutes, stirring now and then, until the pasta is tender.',
      'Stir in the cheese until melted.',
    ],
  }),
  recipe({
    key: 'chicken-rice-skillet',
    name: 'Chicken & Rice Skillet',
    emoji: '🍗',
    category: 'Dinner',
    servings: 4,
    prep_time: 10,
    cook_time: 30,
    description: 'Chicken thighs and rice cooked together in one pan.',
    tags: ['one-pan'],
    ingredients: [
      ['1.5', 'lb', 'chicken thighs', 'chicken-thighs'],
      ['1', 'tbsp', 'olive oil', 'olive-oil'],
      ['1', '', 'yellow onion, diced', 'yellow-onion'],
      ['1', 'cup', 'white rice', 'white-rice'],
      ['2', 'cup', 'chicken broth', 'chicken-broth'],
      ['1', 'cup', 'frozen peas', 'frozen-peas'],
    ],
    steps: [
      'Season the chicken with salt and pepper. Brown it in the oil in a deep skillet, then set aside.',
      'Cook the onion in the same pan until soft. Stir in the rice and broth.',
      'Return the chicken, cover, and simmer 20 minutes until the rice is tender and the chicken is cooked through.',
      'Stir in the peas and cook 2 more minutes.',
    ],
  }),
  recipe({
    key: 'scrambled-eggs-toast',
    name: 'Scrambled Eggs & Toast',
    emoji: '🍳',
    category: 'Breakfast',
    servings: 2,
    prep_time: 2,
    cook_time: 5,
    description: 'Low heat and patience.',
    tags: ['quick'],
    ingredients: [
      ['4', '', 'eggs', 'eggs'],
      ['1', 'tbsp', 'butter', 'butter'],
      ['2', 'slices', 'sandwich bread, toasted', 'sandwich-bread'],
      ['', '', 'salt and pepper'],
    ],
    steps: [
      'Beat the eggs with a pinch of salt.',
      'Melt the butter in a nonstick pan over medium-low heat. Add the eggs and stir gently until just set.',
      'Serve right away with the toast.',
    ],
  }),
  recipe({
    key: 'grilled-cheese',
    name: 'Grilled Cheese',
    emoji: '🧀',
    category: 'Lunch',
    servings: 1,
    prep_time: 2,
    cook_time: 8,
    description: 'Good with the tomato soup.',
    tags: ['quick', 'kid-friendly'],
    ingredients: [
      ['2', 'slices', 'sandwich bread', 'sandwich-bread'],
      ['2', 'slices', 'cheddar cheese', 'cheddar-cheese'],
      ['1', 'tbsp', 'butter', 'butter'],
    ],
    steps: [
      'Butter one side of each slice of bread.',
      'Put the cheese between the slices, buttered sides out.',
      'Cook in a skillet over medium-low heat, about 4 minutes a side, until golden and melted.',
    ],
  }),
  recipe({
    key: 'apples-peanut-butter',
    name: 'Apple Slices & Peanut Butter',
    emoji: '🍎',
    category: 'Snack',
    servings: 2,
    prep_time: 3,
    cook_time: 0,
    description: 'The after-school classic.',
    tags: ['quick', 'no-cook', 'kid-friendly'],
    ingredients: [
      ['2', '', 'apples, sliced', 'apples'],
      ['3', 'tbsp', 'peanut butter', 'peanut-butter'],
    ],
    steps: ['Slice the apples and serve with peanut butter for dipping.'],
  }),
  recipe({
    key: 'peanut-butter-cookies',
    name: 'Three-Ingredient Peanut Butter Cookies',
    emoji: '🍪',
    category: 'Dessert',
    servings: 12,
    prep_time: 10,
    cook_time: 10,
    description: 'No flour needed.',
    tags: ['baking', 'kid-friendly'],
    ingredients: [
      ['1', 'cup', 'peanut butter', 'peanut-butter'],
      ['1', 'cup', 'sugar', 'sugar'],
      ['1', '', 'egg', 'eggs'],
    ],
    steps: [
      'Heat the oven to 350°F.',
      'Mix everything until smooth. Roll into 1-inch balls and place on a baking sheet.',
      'Press each one flat with a fork in a criss-cross pattern.',
      'Bake 10 minutes. Cool on the sheet for 5 minutes before moving them.',
    ],
  }),
  recipe({
    key: 'slow-cooker-pot-roast',
    name: 'Slow Cooker Pot Roast',
    emoji: '🥩',
    category: 'Dinner',
    servings: 6,
    prep_time: 15,
    cook_time: 480,
    description: 'Start it in the morning. The dinner menu stops offering it once it is too late.',
    season: 'winter',
    tags: ['slow cooker'],
    ingredients: [
      ['3', 'lb', 'chuck roast', 'chuck-roast'],
      ['1.5', 'lb', 'potatoes, quartered', 'potatoes'],
      ['4', '', 'carrots, cut in chunks', 'carrots'],
      ['1', '', 'yellow onion, quartered', 'yellow-onion'],
      ['2', 'cup', 'beef broth', 'beef-broth'],
      ['1', 'tbsp', 'Worcestershire sauce', 'worcestershire-sauce'],
    ],
    steps: [
      'Season the roast with salt and pepper and place it in the slow cooker.',
      'Arrange the potatoes, carrots and onion around it. Pour in the broth and Worcestershire.',
      'Cover and cook on low for 8 hours, until the roast pulls apart easily.',
    ],
  }),
  recipe({
    key: 'chicken-salad-sandwich',
    name: 'Chicken Salad Sandwich',
    emoji: '🥪',
    category: 'Lunch',
    servings: 2,
    prep_time: 10,
    cook_time: 0,
    description: 'A good use for leftover chicken.',
    tags: ['quick', 'no-cook'],
    ingredients: [
      ['2', 'cup', 'cooked chicken breast, chopped', 'chicken-breast'],
      ['0.25', 'cup', 'mayonnaise', 'mayonnaise'],
      ['1', '', 'celery stalk, diced', 'celery'],
      ['4', 'slices', 'sandwich bread', 'sandwich-bread'],
      ['', '', 'salt and pepper'],
    ],
    steps: [
      'Stir the chicken, mayonnaise and celery together. Season with salt and pepper.',
      'Pile onto two slices of bread and top with the other two.',
    ],
  }),
];

// More from the library. The demo cook has never made these, so they are what
// its menu offers as something new.
const untried: SeedRecipe[] = [
  recipe({
    key: 'sausage-potato-sheet-pan',
    name: 'Sausage & Potato Sheet Pan',
    emoji: '🥔',
    category: 'Dinner',
    servings: 4,
    prep_time: 10,
    cook_time: 30,
    description: 'Chop, toss, roast.',
    tags: ['one-pan', 'weeknight'],
    ingredients: [
      ['14', 'oz', 'smoked sausage, sliced', 'smoked-sausage'],
      ['1.5', 'lb', 'potatoes, cut in 1-inch pieces', 'potatoes'],
      ['1', '', 'bell pepper, chopped', 'bell-pepper'],
      ['2', 'tbsp', 'olive oil', 'olive-oil'],
      ['1', 'tsp', 'Italian seasoning', 'italian-seasoning'],
    ],
    steps: [
      'Heat the oven to 400°F.',
      'Toss everything with the oil and seasoning on a sheet pan.',
      'Roast 30 minutes, stirring once, until the potatoes are tender and browned.',
    ],
  }),
  recipe({
    key: 'baked-pork-chops',
    name: 'Baked Pork Chops',
    emoji: '🍖',
    category: 'Dinner',
    servings: 4,
    prep_time: 5,
    cook_time: 25,
    description: 'A simple rub and a hot oven.',
    tags: ['quick'],
    ingredients: [
      ['4', '', 'pork chops', 'pork-chops'],
      ['1', 'tbsp', 'olive oil', 'olive-oil'],
      ['1', 'tsp', 'paprika', 'paprika'],
      ['1', 'tsp', 'garlic powder', 'garlic-powder'],
      ['0.5', 'tsp', 'salt', 'salt'],
      ['0.25', 'tsp', 'black pepper', 'black-pepper'],
    ],
    steps: [
      'Heat the oven to 400°F.',
      'Rub the chops with oil, then with the paprika, garlic powder, salt and pepper.',
      'Bake 20–25 minutes until cooked through. Rest 5 minutes before serving.',
    ],
  }),
  recipe({
    key: 'shrimp-fried-rice',
    name: 'Shrimp Fried Rice',
    emoji: '🍤',
    category: 'Dinner',
    servings: 4,
    prep_time: 10,
    cook_time: 15,
    description: 'Best with rice cooked the day before.',
    tags: ['quick'],
    ingredients: [
      ['1', 'lb', 'shrimp, peeled', 'shrimp'],
      ['2', 'tbsp', 'vegetable oil', 'vegetable-oil'],
      ['3', 'cup', 'cooked white rice, cold', 'white-rice'],
      ['2', 'cup', 'frozen mixed vegetables', 'frozen-mixed-vegetables'],
      ['2', '', 'eggs, beaten', 'eggs'],
      ['3', 'tbsp', 'soy sauce', 'soy-sauce'],
      ['2', '', 'green onions, sliced', 'green-onions'],
    ],
    steps: [
      'Cook the shrimp in half the oil in a large skillet until pink, then set aside.',
      'Add the rest of the oil and the vegetables. Cook 3 minutes.',
      'Push everything to one side, scramble the eggs in the space, then mix together.',
      'Add the rice and soy sauce. Stir-fry until hot, then return the shrimp and top with green onions.',
    ],
  }),
  recipe({
    key: 'sausage-breakfast-tacos',
    name: 'Sausage Breakfast Tacos',
    emoji: '🌯',
    category: 'Breakfast',
    servings: 4,
    prep_time: 5,
    cook_time: 10,
    description: 'A weekend breakfast that travels well.',
    tags: ['weekend'],
    ingredients: [
      ['8', 'oz', 'breakfast sausage', 'breakfast-sausage'],
      ['4', '', 'eggs, beaten', 'eggs'],
      ['4', '', 'flour tortillas', 'flour-tortillas'],
      ['0.5', 'cup', 'shredded cheddar cheese', 'cheddar-cheese'],
      ['', '', 'salsa, to serve', 'salsa'],
    ],
    steps: [
      'Brown the sausage in a skillet, breaking it up, then drain.',
      'Add the eggs and scramble with the sausage until set.',
      'Spoon into warm tortillas and top with cheese and salsa.',
    ],
  }),
  recipe({
    key: 'banana-peanut-butter-toast',
    name: 'Banana Peanut Butter Toast',
    emoji: '🍌',
    category: 'Breakfast',
    servings: 1,
    prep_time: 3,
    cook_time: 0,
    description: 'Two minutes, no pan.',
    tags: ['quick', 'no-cook'],
    ingredients: [
      ['2', 'slices', 'sandwich bread, toasted', 'sandwich-bread'],
      ['2', 'tbsp', 'peanut butter', 'peanut-butter'],
      ['1', '', 'banana, sliced', 'bananas'],
      ['', '', 'a drizzle of honey', 'honey'],
    ],
    steps: ['Spread the toast with peanut butter.', 'Top with banana slices and a little honey.'],
  }),
  recipe({
    key: 'black-bean-quesadillas',
    name: 'Black Bean Quesadillas',
    emoji: '🥙',
    category: 'Lunch',
    servings: 2,
    prep_time: 5,
    cook_time: 10,
    description: 'From the pantry in fifteen minutes.',
    tags: ['quick', 'vegetarian'],
    ingredients: [
      ['4', '', 'flour tortillas', 'flour-tortillas'],
      ['1', 'can', 'black beans, drained and rinsed', 'black-beans'],
      ['1', 'cup', 'shredded cheddar cheese', 'cheddar-cheese'],
      ['0.25', 'cup', 'salsa', 'salsa'],
    ],
    steps: [
      'Mash half the beans roughly with the salsa, then stir in the rest.',
      'Spread over two tortillas, top with cheese, and cover with the other two.',
      'Cook in a dry skillet over medium heat, 3–4 minutes a side, until crisp. Cut into wedges.',
    ],
  }),
  recipe({
    key: 'lemon-sardine-toast',
    name: 'Lemon Sardine Toast',
    emoji: '🐟',
    category: 'Lunch',
    servings: 1,
    prep_time: 5,
    cook_time: 0,
    description: 'The demo cook avoids sardines, so this never appears on the demo menu.',
    tags: ['quick', 'no-cook'],
    ingredients: [
      ['1', 'can', 'sardines, drained', 'sardines'],
      ['2', 'slices', 'sandwich bread, toasted', 'sandwich-bread'],
      ['0.5', '', 'lemon', 'lemon'],
      ['', '', 'black pepper', 'black-pepper'],
    ],
    steps: ['Lay the sardines on the toast.', 'Squeeze the lemon over and finish with pepper.'],
  }),
  recipe({
    key: 'loaded-tater-tots',
    name: 'Loaded Tater Tots',
    emoji: '🥔',
    category: 'Snack',
    servings: 4,
    prep_time: 5,
    cook_time: 25,
    description: 'Game-day snack.',
    tags: ['game day'],
    ingredients: [
      ['1', 'bag', 'tater tots (about 2 lb)', 'tater-tots'],
      ['1', 'cup', 'shredded cheddar cheese', 'cheddar-cheese'],
      ['4', 'slices', 'bacon, cooked and crumbled', 'bacon'],
      ['', '', 'sour cream, to serve', 'sour-cream'],
      ['2', '', 'green onions, sliced', 'green-onions'],
    ],
    steps: [
      'Bake the tots on a sheet pan according to the package until crisp.',
      'Top with the cheese and bacon and return to the oven for 3 minutes, until melted.',
      'Finish with sour cream and green onions.',
    ],
  }),
  recipe({
    key: 'banana-bread',
    name: 'Banana Bread',
    emoji: '🍞',
    category: 'Baking',
    servings: 8,
    prep_time: 10,
    cook_time: 60,
    description: 'For the bananas nobody ate.',
    tags: ['baking'],
    ingredients: [
      ['3', '', 'ripe bananas, mashed', 'bananas'],
      ['0.5', 'cup', 'butter, melted', 'butter'],
      ['0.75', 'cup', 'sugar', 'sugar'],
      ['2', '', 'eggs', 'eggs'],
      ['1', 'tsp', 'vanilla extract', 'vanilla-extract'],
      ['1.5', 'cup', 'all-purpose flour', 'all-purpose-flour'],
      ['1', 'tsp', 'baking soda', 'baking-soda'],
      ['0.5', 'tsp', 'salt', 'salt'],
    ],
    steps: [
      'Heat the oven to 350°F and grease a 9x5 loaf pan.',
      'Stir the bananas, butter, sugar, eggs and vanilla together.',
      'Add the flour, baking soda and salt and mix until just combined.',
      'Pour into the pan and bake 55–60 minutes, until a toothpick comes out clean.',
    ],
  }),
];

// The demo account: one household using the site. It owns a single private
// recipe; everything public belongs to the library account below, where no
// visitor can edit it.
export const FULL: SeedData = {
  recipes: [chili],
  staples: [
    { slug: 'milk', inStock: true },
    { slug: 'eggs', inStock: true },
    { slug: 'butter', inStock: true },
    { slug: 'sandwich-bread', inStock: false },
    { slug: 'cheddar-cheese', inStock: false },
    { slug: 'flour-tortillas', inStock: true },
    { slug: 'white-rice', inStock: true },
    { slug: 'spaghetti', inStock: true },
    { slug: 'olive-oil', inStock: true },
    { slug: 'salt', inStock: true },
    { slug: 'black-pepper', inStock: true },
    { slug: 'garlic', inStock: true },
    { slug: 'yellow-onion', inStock: true },
    { slug: 'chicken-breast', inStock: true },
    { slug: 'ground-beef', inStock: true },
    { slug: 'frozen-peas', inStock: true },
    { slug: 'peanut-butter', inStock: true },
  ],
  avoids: ['sardines', 'mushrooms'],
  grocery: ['Paper towels', 'Dish soap'],
  cooked: [
    { key: 'sheet-pan-chicken-fajitas', daysAgo: [10, 24, 45, 66] },
    { key: 'overnight-oats', daysAgo: [8, 11, 15, 22] },
    { key: 'tomato-basil-soup', daysAgo: [2] }, // cooked this week, so it's resting off the menu
    { key: 'spaghetti-meat-sauce', daysAgo: [8, 22, 36, 50, 71] },
    { key: 'turkey-taco-night', daysAgo: [12, 26, 40] },
    { key: 'one-pot-beef-macaroni', daysAgo: [15, 44] },
    { key: 'chicken-rice-skillet', daysAgo: [20] },
    { key: 'scrambled-eggs-toast', daysAgo: [9, 30] },
    { key: 'grilled-cheese', daysAgo: [13, 27, 41] },
    { key: 'peanut-butter-cookies', daysAgo: [19] },
    { key: 'slow-cooker-pot-roast', daysAgo: [14, 42, 70] },
    { key: 'chicken-salad-sandwich', daysAgo: [16] },
    { key: 'apples-peanut-butter', daysAgo: [9, 16, 23, 37] },
  ],
  saved: ['baked-pork-chops', 'banana-bread'],
};

// The library: every public recipe, owned by the "HomeMenu Kitchen" account that
// nobody can log in to.
export const KITCHEN: SeedData = {
  ...EMPTY,
  recipes: [fajitas, oats, soup, salmon, ...everyday, ...untried],
};
