import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

// A throwaway user per test, so each one starts with an empty kitchen and no history.
// Deleting them afterwards removes everything they created (ON DELETE CASCADE).
// Same bcrypt hash as the demo users: password "demo-password".
const DEMO_PASSWORD_HASH = '$2b$12$yaeYdeuJnA93X175H2jsfeJbWgh6/IBEqTpK9QDEPo0s3E8ioqZVy';
const PREFIX = 'menu-tester-';
let userCount = 0;

// Seeded recipes the testers can see: the demo's public dinner-time recipes.
const FAJITAS = 1; // Dinner
const OATS = 2; // Breakfast
const SOUP = 3; // Soup
const SALMON = 4; // Dinner
const DEMO_PRIVATE_CHILI = 5; // Dinner, but private to the demo user

const DAY = '2026-10-20';

async function newUser() {
  const username = `${PREFIX}${++userCount}`;
  await pool.query<ResultSetHeader>(
    'INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)',
    [username, username, `${username}@example.com`, DEMO_PASSWORD_HASH]
  );
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'demo-password' }).expect(200);
  return agent;
}

type Agent = Awaited<ReturnType<typeof newUser>>;

interface MenuPick {
  slot: string;
  reason: string;
  recipe: { id: number; name: string; times_cooked: number };
}

async function getMenu(agent: Agent, query: Record<string, string | number> = {}) {
  const res = await agent
    .get('/api/menu')
    .query({ date: DAY, ...query })
    .expect(200);
  return res.body as {
    meal: string;
    date: string;
    roll: number;
    max_minutes: number | null;
    picks: MenuPick[];
    snoozed: { id: number; name: string; snoozed_until: string }[];
  };
}

// Every recipe id the menu offers across several re-rolls.
async function everythingOffered(agent: Agent, query: Record<string, string | number> = {}) {
  const seen = new Set<number>();
  for (let roll = 0; roll < 6; roll++) {
    const menu = await getMenu(agent, { ...query, roll });
    for (const pick of menu.picks) seen.add(pick.recipe.id);
  }
  return [...seen].sort((a, b) => a - b);
}

async function ingredientId(slug: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM ingredients WHERE slug = ?', [
    slug,
  ]);
  return rows[0]?.id as number;
}

async function cook(agent: Agent, recipeId: number, date: string) {
  await agent.post(`/api/recipes/${recipeId}/cooked`).send({ cooked_on: date }).expect(200);
}

describe('menu API', () => {
  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE username LIKE ?', [`${PREFIX}%`]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE username LIKE ?', [`${PREFIX}%`]);
    await pool.end();
  });

  it('requires login', async () => {
    await request(app).get('/api/menu').expect(401);
    await request(app).post('/api/menu/snooze').send({ recipe_id: FAJITAS }).expect(401);
  });

  it('offers three different dinner picks, one per slot', async () => {
    const me = await newUser();
    const menu = await getMenu(me);

    expect(menu).toMatchObject({ meal: 'dinner', date: DAY, roll: 0 });
    expect(menu.picks.map((p) => p.slot)).toEqual(['safe', 'medium', 'new']);
    expect(menu.picks.map((p) => p.recipe.id).sort()).toEqual([FAJITAS, SOUP, SALMON]);
    expect(menu.picks[0]!.reason).toEqual(expect.any(String));
  });

  it('stays the same all day, and a re-roll is repeatable too', async () => {
    const me = await newUser();
    expect(await getMenu(me)).toEqual(await getMenu(me));
    expect(await getMenu(me, { roll: 1 })).toEqual(await getMenu(me, { roll: 1 }));
  });

  it("never offers someone else's private recipe, or the wrong meal", async () => {
    const me = await newUser();
    const offered = await everythingOffered(me);

    expect(offered).toEqual([FAJITAS, SOUP, SALMON]);
    expect(offered).not.toContain(DEMO_PRIVATE_CHILI);
    expect(await everythingOffered(me, { meal: 'breakfast' })).toEqual([OATS]);
  });

  it('skips recipes that use an avoided ingredient', async () => {
    const me = await newUser();
    // Salmon is an ingredient of recipe 4 only.
    await me
      .post('/api/avoids')
      .send({ ingredient_id: await ingredientId('salmon') })
      .expect(201);

    expect(await everythingOffered(me)).toEqual([FAJITAS, SOUP]);
  });

  it('skips a dish cooked in the last week, then brings it back', async () => {
    const me = await newUser();
    await cook(me, SOUP, '2026-10-18');

    expect(await everythingOffered(me)).toEqual([FAJITAS, SALMON]);
    expect(await everythingOffered(me, { date: '2026-10-25' })).toContain(SOUP);
  });

  it('puts a regular in the safe slot and says why', async () => {
    const me = await newUser();
    await cook(me, FAJITAS, '2026-09-01');
    await cook(me, FAJITAS, '2026-09-10');
    await cook(me, FAJITAS, '2026-09-20');

    const menu = await getMenu(me);
    expect(menu.picks[0]).toMatchObject({
      slot: 'safe',
      reason: "A regular: you've made this 3 times",
      recipe: { id: FAJITAS, times_cooked: 3 },
    });
  });

  it('snooze hides a recipe for 7 days', async () => {
    const me = await newUser();
    const res = await me
      .post('/api/menu/snooze')
      .send({ recipe_id: SALMON, date: DAY })
      .expect(200);
    expect(res.body).toEqual({ recipe_id: SALMON, snoozed_until: '2026-10-27' });

    expect(await everythingOffered(me)).toEqual([FAJITAS, SOUP]);
    // The menu lists what's snoozed, so the page can offer it back.
    expect((await getMenu(me)).snoozed).toEqual([
      expect.objectContaining({
        id: SALMON,
        name: 'Grilled Lemon Salmon',
        snoozed_until: '2026-10-27',
      }),
    ]);
    expect((await getMenu(me, { date: '2026-10-27' })).snoozed).toEqual([]);
    expect(await everythingOffered(me, { date: '2026-10-26' })).not.toContain(SALMON);
    expect(await everythingOffered(me, { date: '2026-10-27' })).toContain(SALMON);
  });

  it('a snooze can be undone, and is per user', async () => {
    const me = await newUser();
    const friend = await newUser();
    await me.post('/api/menu/snooze').send({ recipe_id: SALMON, date: DAY }).expect(200);

    expect(await everythingOffered(friend)).toContain(SALMON);

    await me.delete(`/api/menu/snooze/${SALMON}`).expect(204);
    expect(await everythingOffered(me)).toContain(SALMON);
    await me.delete(`/api/menu/snooze/${SALMON}`).expect(404);
  });

  it('returns an empty menu when nothing fits', async () => {
    const me = await newUser();
    const menu = await getMenu(me, { meal: 'lunch' }); // only the soup counts for lunch
    expect(menu.picks.map((p) => p.recipe.id)).toEqual([SOUP]);

    await me.post('/api/menu/snooze').send({ recipe_id: SOUP, date: DAY }).expect(200);
    const empty = await getMenu(me, { meal: 'lunch' });
    expect(empty.picks).toEqual([]);
    expect(empty.snoozed.map((s) => s.id)).toEqual([SOUP]); // still offered back
  });

  it('leaves out dinners that cannot be ready in time', async () => {
    const me = await newUser();
    const roast = await me
      .post('/api/recipes')
      .send({ name: 'All Day Roast', category: 'Dinner', cook_time: 480 })
      .expect(201);
    const roastId = roast.body.id as number;

    // No clock sent: no limit, so the roast can be offered.
    expect((await getMenu(me)).max_minutes).toBeNull();
    expect(await everythingOffered(me)).toContain(roastId);

    // 5:00 pm with dinner at 6:30 leaves 90 minutes.
    expect((await getMenu(me, { time: '17:00' })).max_minutes).toBe(90);
    expect(await everythingOffered(me, { time: '17:00' })).not.toContain(roastId);

    // 8:00 am leaves all day, and the limit only applies to dinner.
    expect(await everythingOffered(me, { time: '08:00' })).toContain(roastId);
    expect((await getMenu(me, { meal: 'breakfast', time: '17:00' })).max_minutes).toBeNull();
  });

  it('rejects bad requests', async () => {
    const me = await newUser();
    await me.get('/api/menu').query({ meal: 'brunch' }).expect(400);
    await me.get('/api/menu').query({ date: 'today' }).expect(400);
    await me.get('/api/menu').query({ date: '2099-01-01' }).expect(400);
    await me.get('/api/menu').query({ roll: -1 }).expect(400);
    await me.get('/api/menu').query({ time: '6:30pm' }).expect(400);
    await me.get('/api/menu').query({ time: '25:00' }).expect(400);
    await me.post('/api/menu/snooze').send({}).expect(400);
    await me.post('/api/menu/snooze').send({ recipe_id: DEMO_PRIVATE_CHILI }).expect(404);
    await me.post('/api/menu/snooze').send({ recipe_id: 999999 }).expect(404);
  });
});
