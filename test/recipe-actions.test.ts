import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ResultSetHeader } from 'mysql2';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

// Two throwaway users, so nothing here touches the seeded accounts.
// Deleting them afterwards removes their cook log, bookmarks and recipes (ON DELETE CASCADE).
const COOK = 'cook-tester';
const FRIEND = 'cook-friend';
// Same bcrypt hash as the demo users: password "demo-password".
const DEMO_PASSWORD_HASH = '$2b$12$yaeYdeuJnA93X175H2jsfeJbWgh6/IBEqTpK9QDEPo0s3E8ioqZVy';
const userIds: number[] = [];

// Seeded recipes: 1 is the demo's public fajitas, 3 its public soup,
// 5 the demo's private recipe, 6 the neighbor's private one.
const FAJITAS = 1;
const SOUP = 3;
const DEMO_PRIVATE = 5;

async function loginAs(username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'demo-password' }).expect(200);
  return agent;
}

async function createUser(username: string) {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO users (username, display_name, email, password_hash, role, default_visibility)
     VALUES (?, ?, ?, ?, 'user', 'private')`,
    [username, username, `${username}@example.com`, DEMO_PASSWORD_HASH]
  );
  userIds.push(result.insertId);
}

type Agent = Awaited<ReturnType<typeof loginAs>>;

async function getRecipe(agent: Agent, id: number) {
  const res = await agent.get(`/api/recipes/${id}`).expect(200);
  return res.body as { last_made: string | null; saved: boolean };
}

describe('recipe actions API', () => {
  beforeAll(async () => {
    await pool.query('DELETE FROM users WHERE username IN (?, ?)', [COOK, FRIEND]);
    await createUser(COOK);
    await createUser(FRIEND);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id IN (?)', [userIds]);
    await pool.end();
  });

  describe('We made this', () => {
    it('requires login', async () => {
      await request(app).post(`/api/recipes/${FAJITAS}/cooked`).expect(401);
    });

    it('logs a cook and reports it as last_made', async () => {
      const cook = await loginAs(COOK);
      expect((await getRecipe(cook, FAJITAS)).last_made).toBeNull();

      const res = await cook
        .post(`/api/recipes/${FAJITAS}/cooked`)
        .send({ cooked_on: '2026-11-10' })
        .expect(200);
      expect(res.body).toEqual({ last_made: '2026-11-10' });

      expect((await getRecipe(cook, FAJITAS)).last_made).toBe('2026-11-10');
      const list = await cook.get('/api/recipes').expect(200);
      expect(list.body).toContainEqual(
        expect.objectContaining({ id: FAJITAS, last_made: '2026-11-10' })
      );
    });

    it('keeps the newest date as last_made, whatever order they arrive in', async () => {
      const cook = await loginAs(COOK);
      await cook.post(`/api/recipes/${SOUP}/cooked`).send({ cooked_on: '2026-11-12' }).expect(200);
      const older = await cook
        .post(`/api/recipes/${SOUP}/cooked`)
        .send({ cooked_on: '2026-11-01' })
        .expect(200);
      expect(older.body.last_made).toBe('2026-11-12');
    });

    it('uses today when no date is sent, and tapping twice logs it once', async () => {
      const cook = await loginAs(COOK);
      const own = await cook.post('/api/recipes').send({ name: 'Tap Twice Tacos' }).expect(201);
      const id = own.body.id as number;

      const first = await cook.post(`/api/recipes/${id}/cooked`).expect(200);
      expect(first.body.last_made).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      await cook.post(`/api/recipes/${id}/cooked`).expect(200);

      const [rows] = await pool.query('SELECT id FROM cook_log WHERE recipe_id = ?', [id]);
      expect(rows).toHaveLength(1);
    });

    it("is per user: one household's cooking doesn't show for another", async () => {
      const cook = await loginAs(COOK);
      const friend = await loginAs(FRIEND);
      await cook
        .post(`/api/recipes/${FAJITAS}/cooked`)
        .send({ cooked_on: '2026-11-10' })
        .expect(200);

      expect((await getRecipe(friend, FAJITAS)).last_made).toBeNull();
      const guest = await request(app).get(`/api/recipes/${FAJITAS}`).expect(200);
      expect(guest.body.last_made).toBeNull();
    });

    it('undo removes that day and falls back to the one before', async () => {
      const cook = await loginAs(COOK);
      const own = await cook.post('/api/recipes').send({ name: 'Undo Omelette' }).expect(201);
      const id = own.body.id as number;
      await cook.post(`/api/recipes/${id}/cooked`).send({ cooked_on: '2026-10-01' }).expect(200);
      await cook.post(`/api/recipes/${id}/cooked`).send({ cooked_on: '2026-10-20' }).expect(200);

      const undone = await cook.delete(`/api/recipes/${id}/cooked/2026-10-20`).expect(200);
      expect(undone.body).toEqual({ last_made: '2026-10-01' });

      // Nothing left to undo for that day.
      await cook.delete(`/api/recipes/${id}/cooked/2026-10-20`).expect(404);
    });

    it("can't log a recipe you can't see", async () => {
      const cook = await loginAs(COOK);
      await cook.post(`/api/recipes/${DEMO_PRIVATE}/cooked`).expect(404);
      await cook.post('/api/recipes/999999/cooked').expect(404);
    });

    it('rejects bad ids and bad or future dates with 400', async () => {
      const cook = await loginAs(COOK);
      await cook.post('/api/recipes/abc/cooked').expect(400);
      await cook
        .post(`/api/recipes/${FAJITAS}/cooked`)
        .send({ cooked_on: 'yesterday' })
        .expect(400);
      await cook
        .post(`/api/recipes/${FAJITAS}/cooked`)
        .send({ cooked_on: '2099-01-01' })
        .expect(400);
      await cook.delete(`/api/recipes/${FAJITAS}/cooked/not-a-date`).expect(400);
    });
  });

  describe('saved recipes', () => {
    it('requires login', async () => {
      await request(app).put(`/api/recipes/${FAJITAS}/saved`).expect(401);
    });

    it("saves someone's public recipe, and saving twice is fine", async () => {
      const cook = await loginAs(COOK);
      expect((await getRecipe(cook, SOUP)).saved).toBe(false);

      await cook.put(`/api/recipes/${SOUP}/saved`).expect(204);
      await cook.put(`/api/recipes/${SOUP}/saved`).expect(204);

      expect((await getRecipe(cook, SOUP)).saved).toBe(true);
      const list = await cook.get('/api/recipes').expect(200);
      expect(list.body).toContainEqual(expect.objectContaining({ id: SOUP, saved: true }));
    });

    it('is per user, and guests see saved: false', async () => {
      const cook = await loginAs(COOK);
      const friend = await loginAs(FRIEND);
      await cook.put(`/api/recipes/${SOUP}/saved`).expect(204);

      expect((await getRecipe(friend, SOUP)).saved).toBe(false);
      const guest = await request(app).get('/api/recipes').expect(200);
      expect(guest.body.every((r: { saved: boolean }) => r.saved === false)).toBe(true);
    });

    it('removes a bookmark, and 404s when there is none', async () => {
      const cook = await loginAs(COOK);
      await cook.put(`/api/recipes/${FAJITAS}/saved`).expect(204);
      await cook.delete(`/api/recipes/${FAJITAS}/saved`).expect(204);
      expect((await getRecipe(cook, FAJITAS)).saved).toBe(false);
      await cook.delete(`/api/recipes/${FAJITAS}/saved`).expect(404);
    });

    it("won't save your own recipe", async () => {
      const cook = await loginAs(COOK);
      const own = await cook.post('/api/recipes').send({ name: 'My Own Chili' }).expect(201);
      await cook.put(`/api/recipes/${own.body.id}/saved`).expect(400);
    });

    it("can't save a private recipe that isn't yours", async () => {
      const cook = await loginAs(COOK);
      await cook.put(`/api/recipes/${DEMO_PRIVATE}/saved`).expect(404);
      await cook.put('/api/recipes/abc/saved').expect(400);
    });

    it('a bookmark disappears with the recipe', async () => {
      // Tests never create public recipes (other test files count the public ones),
      // so this bookmark row is written directly instead of through the API.
      const friend = await loginAs(FRIEND);
      const recipe = await friend
        .post('/api/recipes')
        .send({ name: 'Short-Lived Stew' })
        .expect(201);
      const id = recipe.body.id as number;
      await pool.query('INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [
        userIds[0],
        id,
      ]);

      await friend.delete(`/api/recipes/${id}`).expect(204);
      const [rows] = await pool.query('SELECT user_id FROM saved_recipes WHERE recipe_id = ?', [
        id,
      ]);
      expect(rows).toHaveLength(0);
    });
  });
});
