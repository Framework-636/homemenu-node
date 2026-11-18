import { describe, expect, it } from 'vitest';
import { buildMenu, familiarity, tierOf, type Candidate } from '../src/menu/engine.ts';

// The engine is plain logic: no database, no clock. These tests build a small
// household by hand and check what it gets offered.

const DATE = '2026-10-20';

// A recipe with sensible defaults; each test overrides only what it cares about.
function recipe(id: number, overrides: Partial<Candidate> = {}): Candidate {
  return {
    id,
    isOwn: false,
    timesCooked: 0,
    lastMade: null,
    linkedIngredients: 4,
    knownIngredients: 4,
    ...overrides,
  };
}

const regular = (id: number, timesCooked = 5) =>
  recipe(id, { timesCooked, lastMade: '2026-09-01' });
const triedOnce = (id: number) => recipe(id, { timesCooked: 1, lastMade: '2026-09-01' });
const brandNew = (id: number, known = 4) => recipe(id, { knownIngredients: known });

// Two regulars (1, 2), two tried once (11, 12), two never cooked (21, 22).
const household = [
  regular(1),
  regular(2),
  triedOnce(11),
  triedOnce(12),
  brandNew(21),
  brandNew(22),
];

function menu(candidates: Candidate[], seed = 'seed', roll = 0, date = DATE) {
  return buildMenu({ candidates, date, seed, roll });
}

const ids = (picks: { recipeId: number }[]) => picks.map((p) => p.recipeId);

describe('tiers', () => {
  it('sorts recipes into safe, medium and new', () => {
    expect(tierOf(regular(1, 3))).toBe('safe');
    expect(tierOf(recipe(2, { timesCooked: 2 }))).toBe('medium');
    expect(tierOf(recipe(3, { isOwn: true }))).toBe('medium'); // yours, not made yet
    expect(tierOf(brandNew(4))).toBe('new');
  });

  it('measures how familiar a recipe is by its known ingredients', () => {
    expect(familiarity(recipe(1, { linkedIngredients: 4, knownIngredients: 3 }))).toBe(0.75);
    expect(familiarity(recipe(2, { linkedIngredients: 0, knownIngredients: 0 }))).toBe(0);
  });
});

describe('buildMenu', () => {
  it('offers one safe, one medium and one new pick', () => {
    const picks = menu(household);

    expect(picks.map((p) => p.slot)).toEqual(['safe', 'medium', 'new']);
    expect([1, 2]).toContain(picks[0]!.recipeId);
    expect([11, 12]).toContain(picks[1]!.recipeId);
    expect([21, 22]).toContain(picks[2]!.recipeId);
  });

  it('gives the same menu for the same seed, every time', () => {
    expect(menu(household, 'tuesday')).toEqual(menu(household, 'tuesday'));
  });

  it("doesn't depend on the order the recipes arrive in", () => {
    const reversed = [...household].reverse();
    expect(menu(reversed, 'tuesday')).toEqual(menu(household, 'tuesday'));
  });

  it('varies from one day to the next', () => {
    const menus = new Set<string>();
    for (let day = 1; day <= 30; day++) menus.add(ids(menu(household, `day-${day}`)).join(','));
    expect(menus.size).toBeGreaterThan(1);
  });

  it('a re-roll changes every slot that has a choice, then comes back around', () => {
    const first = menu(household, 'tuesday', 0);
    const second = menu(household, 'tuesday', 1);
    const third = menu(household, 'tuesday', 2);

    for (let slot = 0; slot < 3; slot++) {
      expect(second[slot]!.recipeId).not.toBe(first[slot]!.recipeId);
    }
    expect(third).toEqual(first); // two per tier, so the third roll is the first again
  });

  it('skips anything cooked in the last 7 days', () => {
    const cookedYesterday = recipe(1, { timesCooked: 9, lastMade: '2026-10-19' });
    const cookedSixDaysAgo = recipe(2, { timesCooked: 9, lastMade: '2026-10-14' });
    const cookedAWeekAgo = recipe(3, { timesCooked: 9, lastMade: '2026-10-13' });

    for (let roll = 0; roll < 5; roll++) {
      const picks = menu([cookedYesterday, cookedSixDaysAgo, cookedAWeekAgo], 'seed', roll);
      expect(ids(picks)).toEqual([3]);
    }
  });

  it('leans toward the meals you make most often', () => {
    const candidates = [regular(1, 3), regular(2, 12)];
    let favoriteFirst = 0;
    for (let day = 0; day < 200; day++) {
      if (menu(candidates, `day-${day}`)[0]!.recipeId === 2) favoriteFirst++;
    }
    // Cooked four times as often, so it should lead well over half the time, but not always.
    expect(favoriteFirst).toBeGreaterThan(130);
    expect(favoriteFirst).toBeLessThan(200);
  });

  it('only suggests new recipes made from familiar ingredients, when there are any', () => {
    const familiar = brandNew(21, 3); // 3 of 4 known
    const strange = brandNew(22, 1); // 1 of 4 known
    for (let roll = 0; roll < 4; roll++) {
      const picks = menu([regular(1), triedOnce(11), familiar, strange], 'seed', roll);
      expect(picks.find((p) => p.slot === 'new')!.recipeId).toBe(21);
    }
  });

  it('falls back to a less familiar new recipe rather than leaving the slot empty', () => {
    const picks = menu([regular(1), triedOnce(11), brandNew(22, 1)]);
    expect(picks.find((p) => p.slot === 'new')!.recipeId).toBe(22);
  });

  it('fills empty slots for a household with no cooking history yet', () => {
    const picks = menu([brandNew(21), brandNew(22), brandNew(23), brandNew(24)]);

    expect(picks.map((p) => p.slot)).toEqual(['safe', 'medium', 'new']);
    expect(new Set(ids(picks)).size).toBe(3); // three different recipes
  });

  it('never repeats a recipe and never invents one', () => {
    for (let roll = 0; roll < 6; roll++) {
      const picks = menu([regular(1), brandNew(21)], 'seed', roll);
      expect(ids(picks).sort()).toEqual([1, 21]);
    }
    expect(menu([])).toEqual([]);
  });

  it('explains each pick', () => {
    const own = recipe(11, { isOwn: true });
    const picks = menu([regular(1, 5), own, brandNew(21, 3)]);

    expect(picks.map((p) => p.reason)).toEqual([
      "A regular: you've made this 5 times",
      "Your recipe, and you haven't made it yet",
      'New to you, and you already use 3 of its 4 ingredients',
    ]);
  });
});
