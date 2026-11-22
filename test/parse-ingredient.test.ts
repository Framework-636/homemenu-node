import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from '../src/recipes/parse-ingredient.ts';

describe('parseIngredientLine', () => {
  it('splits quantity, unit and ingredient', () => {
    expect(parseIngredientLine('2 cups flour')).toEqual({
      quantity: '2',
      unit: 'cups',
      ingredient: 'flour',
    });
  });

  it('does not treat the second word as a unit unless it is one (issue #13)', () => {
    expect(parseIngredientLine('1 Onion (yellow)')).toEqual({
      quantity: '1',
      unit: '',
      ingredient: 'Onion (yellow)',
    });
  });

  it('keeps the whole line as the ingredient when there is no quantity', () => {
    expect(parseIngredientLine('Salt and pepper to taste')).toEqual({
      quantity: '',
      unit: '',
      ingredient: 'Salt and pepper to taste',
    });
  });

  it('recognizes units whatever their case, with or without a period', () => {
    expect(parseIngredientLine('2 Tbsp. olive oil').unit).toBe('Tbsp.');
    expect(parseIngredientLine('1 LB ground beef').unit).toBe('LB');
  });

  it('ignores extra spaces', () => {
    expect(parseIngredientLine('  3   cloves   garlic  ')).toEqual({
      quantity: '3',
      unit: 'cloves',
      ingredient: 'garlic',
    });
  });

  it('does not mistake a lone unit word for a unit', () => {
    // "1 can" with nothing after it: there is no ingredient left to attach the unit to.
    expect(parseIngredientLine('1 can')).toEqual({ quantity: '1', unit: '', ingredient: 'can' });
  });

  it('reads fractions, decimals and mixed numbers as the quantity', () => {
    expect(parseIngredientLine('1/2 cup sugar').quantity).toBe('1/2');
    expect(parseIngredientLine('½ c. shredded cheese').quantity).toBe('½');
    expect(parseIngredientLine('1.5 lb chicken breast').quantity).toBe('1.5');
    expect(parseIngredientLine('1 1/2 cups flour')).toEqual({
      quantity: '1 1/2',
      unit: 'cups',
      ingredient: 'flour',
    });
    expect(parseIngredientLine('2 ½ lb. pork butt').quantity).toBe('2 ½');
  });

  it('reads a range as the quantity', () => {
    expect(parseIngredientLine('3-4 lb. beef roast, any kind')).toEqual({
      quantity: '3-4',
      unit: 'lb.',
      ingredient: 'beef roast, any kind',
    });
    expect(parseIngredientLine('2 - 3 chicken breasts').quantity).toBe('2 - 3');
  });

  it('keeps a package size with the ingredient', () => {
    // Two packages of 10 oz each: the "10 oz" describes the package, not the amount.
    expect(parseIngredientLine('2 10 oz pkgs frozen broccoli florets')).toEqual({
      quantity: '2',
      unit: '',
      ingredient: '10 oz pkgs frozen broccoli florets',
    });
  });

  it('leaves a line that only starts with a number-like word alone', () => {
    expect(parseIngredientLine('7UP, chilled').quantity).toBe('');
  });
});
