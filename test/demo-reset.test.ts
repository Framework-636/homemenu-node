import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';
import { BASELINE, FULL, KITCHEN } from '../src/demo/demo-data.ts';
import { resetAccount, type SeedData } from '../src/demo/reset.ts';

// The reset is tested on a throwaway "showcase" account with its own tiny seed
// data, never on the real demo account: other test files are using that one at
// the same time. A second account, the "visitor", stands in for everybody else.
// Same bcrypt hash as the demo users: password "demo-password".
const DEMO_PASSWORD_HASH = '$2b$12$yaeYdeuJnA93X175H2jsfeJbWgh6/IBEqTpK9QDEPo0s3E8ioqZVy';
const SHOWCASE = 'reset-showcase';
const VISITOR = 'reset-visitor';
const TODAY = '2026-10-20';
let showcaseId = 0;
let visitorId = 0;

// Private recipes, so other test files (which count the public ones) never see them.
const SEED: SeedData = {
  recipes: [
    {
      key: 'test-reset-stew',
      name: 'Reset Test Stew',
      emoji: '🍲',
      category: 'Dinner',
      servings: 4,
      prep_time: 10,
      cook_time: 40,
      description: 'Seed recipe used by the reset tests.',
      visibility: 'private',
      season: 'any',
      tags: ['test'],
      ingredients: [
        { quantity: '1', unit: 'lb', ingredient: 'ground beef', slug: 'ground-beef' },
        { quantity: '', unit: '', ingredient: 'salt to taste' },
      ],
      steps: ['Brown the beef.', 'Simmer.'],
      cookedDaysAgo: [10, 30],
    },
    {
      key: 'test-reset-toast',
      name: 'Reset Test Toast',
      emoji: '🍞',
      category: 'Breakfast',
      servings: 1,
      prep_time: 1,
      cook_time: 2,
      description: null,
      visibility: 'private',
      season: 'any',
      tags: [],
      ingredients: [],
      steps: ['Toast the bread.'],
    },
  ],
  staples: [
    { slug: 'milk', inStock: true },
    { slug: 'eggs', inStock: false },
  ],
  avoids: ['sardines'],
  grocery: ['Paper towels'],
};

async function createUser(username: string): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)',
    [username, username, `${username}@example.com`, DEMO_PASSWORD_HASH]
  );
  return result.insertId;
}

async function loginAs(username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'demo-password' }).expect(200);
  return agent;
}

async function reset(data: SeedData = SEED) {
  const conn = await pool.getConnection();
  try {
    return await resetAccount(conn, showcaseId, data, TODAY);
  } finally {
    conn.release();
  }
}

async function count(sql: string, params: unknown[]): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return Number(rows[0]?.n);
}

async function recipeId(key: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM recipes WHERE seed_key = ?', [
    key,
  ]);
  return rows[0]?.id as number;
}

describe('demo reset', () => {
  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE username IN (?, ?)', [SHOWCASE, VISITOR]);
    showcaseId = await createUser(SHOWCASE);
    visitorId = await createUser(VISITOR);
    await reset();
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id IN (?, ?)', [showcaseId, visitorId]);
    await pool.end();
  });

  it('creates the seed recipes, lists and cooking history', async () => {
    const me = await loginAs(SHOWCASE);
    const stew = await me.get(`/api/recipes/${await recipeId('test-reset-stew')}`).expect(200);

    expect(stew.body).toMatchObject({
      name: 'Reset Test Stew',
      cook_time: 40,
      last_made: '2026-10-10', // 10 days before TODAY
      tags: ['test'],
    });
    expect(stew.body.ingredients).toHaveLength(2);
    expect(stew.body.ingredients[0].ingredient_id).toEqual(expect.any(Number)); // linked to the catalog
    expect(stew.body.ingredients[1].ingredient_id).toBeNull();
    expect(stew.body.instructions).toHaveLength(2);

    const staples = await me.get('/api/staples').expect(200);
    expect(staples.body.map((s: { name: string }) => s.name).sort()).toEqual(['Eggs', 'Milk']);
    const avoids = await me.get('/api/avoids').expect(200);
    expect(avoids.body).toHaveLength(1);
    const grocery = await me.get('/api/grocery').expect(200);
    expect(grocery.body.map((g: { name: string }) => g.name).sort()).toEqual([
      'Eggs', // the out-of-stock staple
      'Paper towels',
    ]);
  });

  it("undoes a day of visitors' changes", async () => {
    const me = await loginAs(SHOWCASE);
    const stewId = await recipeId('test-reset-stew');

    // What a visitor to the demo might do: edit a recipe, add one, change the lists.
    await me
      .put(`/api/recipes/${stewId}`)
      .send({ name: 'Vandalized Stew', ingredients: [], instructions: [] })
      .expect(204);
    await me.post('/api/recipes').send({ name: 'Something A Visitor Added' }).expect(201);
    await me.post(`/api/recipes/${stewId}/cooked`).send({ cooked_on: '2026-10-19' }).expect(200);
    await me.post('/api/grocery/items').send({ name: 'Mystery item' }).expect(201);
    await me.post('/api/menu/snooze').send({ recipe_id: stewId, date: TODAY }).expect(200);

    const summary = await reset();
    expect(summary).toEqual({ recipesRestored: 2, recipesAdded: 0, recipesRemoved: 1 });

    // Same recipe row, original content.
    const stew = await me.get(`/api/recipes/${stewId}`).expect(200);
    expect(stew.body.name).toBe('Reset Test Stew');
    expect(stew.body.ingredients).toHaveLength(2);
    expect(stew.body.last_made).toBe('2026-10-10');

    const list = await me.get('/api/recipes').expect(200);
    const mine = list.body.filter((r: { user_id: number }) => r.user_id === showcaseId);
    expect(mine.map((r: { name: string }) => r.name).sort()).toEqual([
      'Reset Test Stew',
      'Reset Test Toast',
    ]);
    const grocery = await me.get('/api/grocery').expect(200);
    expect(grocery.body.map((g: { name: string }) => g.name)).not.toContain('Mystery item');
    expect(
      await count('SELECT COUNT(*) n FROM recipe_snoozes WHERE user_id = ?', [showcaseId])
    ).toBe(0);
  });

  it('brings back a seed recipe that was deleted', async () => {
    const me = await loginAs(SHOWCASE);
    await me.delete(`/api/recipes/${await recipeId('test-reset-toast')}`).expect(204);

    const summary = await reset();
    expect(summary).toEqual({ recipesRestored: 1, recipesAdded: 1, recipesRemoved: 0 });
    expect(await recipeId('test-reset-toast')).toEqual(expect.any(Number));
  });

  it("never touches another account's data", async () => {
    const visitor = await loginAs(VISITOR);
    const stewId = await recipeId('test-reset-stew');

    // The visitor's own things, plus their history with one of the showcase recipes.
    // (Written directly: the stew is private, so the API wouldn't let them log it.)
    const own = await visitor.post('/api/recipes').send({ name: "Visitor's Own Soup" }).expect(201);
    await visitor.post('/api/grocery/items').send({ name: 'Visitor groceries' }).expect(201);
    await pool.query('INSERT INTO cook_log (user_id, recipe_id, cooked_on) VALUES (?, ?, ?)', [
      visitorId,
      stewId,
      '2026-10-01',
    ]);
    await pool.query('INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [
      visitorId,
      stewId,
    ]);

    await reset();

    await visitor.get(`/api/recipes/${own.body.id}`).expect(200);
    const grocery = await visitor.get('/api/grocery').expect(200);
    expect(grocery.body.map((g: { name: string }) => g.name)).toContain('Visitor groceries');
    expect(
      await count('SELECT COUNT(*) n FROM cook_log WHERE user_id = ? AND recipe_id = ?', [
        visitorId,
        stewId,
      ])
    ).toBe(1);
    expect(
      await count('SELECT COUNT(*) n FROM saved_recipes WHERE user_id = ? AND recipe_id = ?', [
        visitorId,
        stewId,
      ])
    ).toBe(1);
  });

  it('removes seed recipes that are no longer in the data', async () => {
    const onlyStew: SeedData = { ...SEED, recipes: [SEED.recipes[0]!] };
    const summary = await reset(onlyStew);

    expect(summary.recipesRemoved).toBe(1);
    expect(await recipeId('test-reset-toast')).toBeUndefined();
    await reset(); // put the toast back for any test that runs after this one
  });

  it('an account with no valid password hash cannot be logged in to', async () => {
    // Its password field holds text that is not a hash, so no password can match.
    await pool.query('DELETE FROM users WHERE username = ?', ['reset-nologin']);
    await pool.query(
      "INSERT INTO users (username, display_name, email, password_hash) VALUES ('reset-nologin', 'No Login', 'reset-nologin@example.com', '!no-login')"
    );
    for (const password of ['!no-login', '', 'demo-password']) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'reset-nologin', password })
        .expect(password === '' ? 400 : 401);
    }
    await pool.query('DELETE FROM users WHERE username = ?', ['reset-nologin']);
  });

  it('leaves the account untouched if the seed data is wrong', async () => {
    const broken: SeedData = { ...SEED, avoids: ['not-a-real-ingredient'] };
    await expect(reset(broken)).rejects.toThrow('unknown ingredient');

    // Rolled back: the lists from the last good reset are still there.
    expect(
      await count('SELECT COUNT(*) n FROM kitchen_items WHERE user_id = ?', [showcaseId])
    ).toBe(2);
  });
});

describe('demo data', () => {
  it('has a unique key for every recipe and keeps the baseline to the original five', () => {
    const keys = [...FULL.recipes, ...KITCHEN.recipes].map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(BASELINE.recipes.map((r) => r.name)).toEqual([
      'Sheet Pan Chicken Fajitas',
      'Overnight Oats',
      'Tomato Basil Soup',
      'Grilled Lemon Salmon',
      'Secret Family Chili',
    ]);
  });

  it('fits the limits the recipe form enforces', () => {
    for (const recipe of [...FULL.recipes, ...KITCHEN.recipes]) {
      expect(recipe.name.length).toBeLessThanOrEqual(160);
      expect(recipe.key.length).toBeLessThanOrEqual(60);
      expect(recipe.steps.length).toBeGreaterThan(0);
      for (const tag of recipe.tags) expect(tag).toBe(tag.toLowerCase());
    }
  });
});
