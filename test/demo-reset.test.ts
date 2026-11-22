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
  cooked: [{ key: 'test-reset-stew', daysAgo: [10, 30] }],
  saved: [],
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

  it('hands a seed recipe to another account without changing its id', async () => {
    const stewId = await recipeId('test-reset-stew');
    await pool.query('INSERT IGNORE INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [
      visitorId,
      stewId,
    ]);

    // The seed data now says the stew belongs to the visitor account
    // (this is how the public recipes moved from the demo account to the library).
    const stew = SEED.recipes[0]!;
    const conn = await pool.getConnection();
    try {
      await resetAccount(conn, visitorId, { ...SEED, recipes: [stew], cooked: [] }, TODAY);
    } finally {
      conn.release();
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, user_id FROM recipes WHERE seed_key = ?',
      ['test-reset-stew']
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: stewId, user_id: visitorId });

    // Take it back, with the showcase account's own history intact, for the tests below.
    await reset();
    expect(await recipeId('test-reset-stew')).toBe(stewId);
    const me = await loginAs(SHOWCASE);
    expect((await me.get(`/api/recipes/${stewId}`).expect(200)).body.last_made).toBe('2026-10-10');
  });

  it('removes seed recipes that are no longer in the data', async () => {
    const onlyStew: SeedData = { ...SEED, recipes: [SEED.recipes[0]!] };
    const summary = await reset(onlyStew);

    expect(summary.recipesRemoved).toBe(1);
    expect(await recipeId('test-reset-toast')).toBeUndefined();
    await reset(); // put the toast back for any test that runs after this one
  });

  it('an account that may not publish can only save private recipes', async () => {
    const me = await loginAs(SHOWCASE);
    expect((await me.get('/api/auth/me').expect(200)).body.user.can_publish).toBe(true);

    await pool.query('UPDATE users SET can_publish = 0 WHERE id = ?', [showcaseId]);
    try {
      expect((await me.get('/api/auth/me').expect(200)).body.user.can_publish).toBe(false);

      // Asking for public is accepted, and quietly stored as private.
      const created = await me
        .post('/api/recipes')
        .send({ name: 'Tried To Publish', visibility: 'public' })
        .expect(201);
      const id = created.body.id as number;
      expect((await me.get(`/api/recipes/${id}`).expect(200)).body.visibility).toBe('private');

      await me
        .put(`/api/recipes/${id}`)
        .send({ name: 'Tried Again', visibility: 'public' })
        .expect(204);
      expect((await me.get(`/api/recipes/${id}`).expect(200)).body.visibility).toBe('private');

      // Nobody else can see it.
      const visitor = await loginAs(VISITOR);
      await visitor.get(`/api/recipes/${id}`).expect(404);
      await me.delete(`/api/recipes/${id}`).expect(204);
    } finally {
      await pool.query('UPDATE users SET can_publish = 1 WHERE id = ?', [showcaseId]);
    }
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

  it('keeps every public demo recipe out of the account visitors log in to', () => {
    // The demo account is shared, so it must own nothing other people can see.
    expect(FULL.recipes.every((r) => r.visibility === 'private')).toBe(true);
    expect(KITCHEN.recipes.every((r) => r.visibility === 'public')).toBe(true);
  });

  it("only refers to recipes that exist in the demo's history and bookmarks", () => {
    const keys = new Set([...FULL.recipes, ...KITCHEN.recipes].map((r) => r.key));
    for (const { key } of FULL.cooked) expect(keys.has(key)).toBe(true);
    for (const key of FULL.saved) expect(keys.has(key)).toBe(true);
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
