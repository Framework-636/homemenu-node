// Splits one ingredient line, as a person would type it, into the three
// parts a recipe stores: "2 cups flour" -> quantity "2", unit "cups", ingredient "flour".
//
// The rule that matters: a word only counts as a unit if it is a known unit.
// "1 Onion (yellow)" has no unit, so "Onion" stays part of the ingredient.

export interface IngredientParts {
  quantity: string;
  unit: string;
  ingredient: string;
}

// Words that are units, in lower case and without a trailing period.
// prettier-ignore
const UNITS = new Set([
  'cup', 'cups', 'c',
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons',
  'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds',
  'g', 'kg', 'ml', 'l',
  'pinch', 'dash',
  'can', 'cans', 'jar', 'jars', 'box', 'bag', 'bottle',
  'pkg', 'pkgs', 'package', 'packages', 'packet', 'packets',
  'clove', 'cloves', 'slice', 'slices', 'stick', 'sticks', 'stalk', 'stalks','rack', 'racks',
]);

function isUnit(word: string): boolean {
  return UNITS.has(word.toLowerCase().replace(/\.$/, ''));
}
// One number as people write them in recipes: 2, 1.5, 1/2 or a fraction character like ½.
const NUMBER = String.raw`(?:\d+(?:\.\d+)?(?:/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])`;
// A fraction on its own, for the second half of a mixed number such as "1 1/2" or "1 ½".
const FRACTION = String.raw`(?:\d+/\d+|[¼½¾⅓⅔⅛⅜⅝⅞])`;
// A whole quantity at the start of a line, then the rest of the line:
//   a number, optionally a range ("3-4"), optionally a fraction after it ("1 1/2").
const QUANTITY = new RegExp(`^(${NUMBER}(?:\\s?[-–]\\s?${NUMBER})?(?: ${FRACTION})?)(?: (.*))?$`);

export function parseIngredientLine(line: string): IngredientParts {
  const text = line.trim().replace(/\s+/g, ' '); // one space between words

  // No number at the front: the whole line is the ingredient.
  const match = QUANTITY.exec(text);
  if (!match) return { quantity: '', unit: '', ingredient: text };

  const quantity = match[1] ?? '';
  const [first = '', ...rest] = (match[2] ?? '').split(' ');

  // A known unit with something after it: all three parts.
  if (rest.length > 0 && isUnit(first)) {
    return { quantity, unit: first, ingredient: rest.join(' ') };
  }
  // A number but no unit: everything after the number is the ingredient.
  return { quantity, unit: '', ingredient: [first, ...rest].join(' ') };
}
