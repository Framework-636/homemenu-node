import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

const TEST_USER = 'grocery-tester';
// Same bcrypt hash as the demo users: password "demo-password".
const DEMO_PASSWORD_HASH = '$2b$12$yaeYdeuJnA93X175H2jsfeJbWgh6/IBEqTpK9QDEPo0s3E8ioqZVy';
let testUserId = 0;

async function loginAs(username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'demo-password' }).expect(200);
  return agent;
}

async function ingredientId(slug: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM ingredients WHERE slug = ?', [
    slug,
  ]);
  return rows[0]?.id as number;
}

type Agent = Awaited<ReturnType<typeof loginAs>>;

// Add a staple and optionally mark it out of stock; returns the staple id.
async function addStaple(agent: Agent, slug: string, inStock: boolean): Promise<number> {
  const created = await agent
    .post('/api/staples')
    .send({ ingredient_id: await ingredientId(slug) })
    .expect(201);
  if (!inStock) {
    await agent.patch(`/api/staples/${created.body.id}`).send({ in_stock: false }).expect(204);
  }
  return created.body.id as number;
}

describe('grocery list API', () => {
  beforeAll(async () => {
    // Remove a leftover tester from a crashed run (cascades to its staples and items).
    await pool.query('DELETE FROM users WHERE username = ?', [TEST_USER]);
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO users (username, display_name, email, password_hash) VALUES (?, 'Grocery Tester', 'grocery-tester@example.com', ?)",
      [TEST_USER, DEMO_PASSWORD_HASH]
    );
    testUserId = result.insertId;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE id = ?', [testUserId]);
    await pool.end();
  });

  it('requires login', async () => {
    await request(app).get('/api/grocery').expect(401);
  });

  it('lists out-of-stock staples but not in-stock ones', async () => {
    const me = await loginAs(TEST_USER);
    await addStaple(me, 'milk', false);
    await addStaple(me, 'eggs', true);

    const res = await me.get('/api/grocery').expect(200);
    const names = res.body.map((row: { name: string }) => row.name);
    expect(names).toContain('Milk');
    expect(names).not.toContain('Eggs');
    expect(res.body).toContainEqual(expect.objectContaining({ source: 'staple', name: 'Milk' }));
  });

  it('Got it puts a staple back in stock', async () => {
    const me = await loginAs(TEST_USER);
    const bread = await addStaple(me, 'sandwich-bread', false);

    await me.post(`/api/grocery/staples/${bread}/got-it`).expect(204);

    const grocery = await me.get('/api/grocery').expect(200);
    expect(grocery.body).not.toContainEqual(expect.objectContaining({ name: 'Sandwich Bread' }));
    const staples = await me.get('/api/staples').expect(200);
    expect(staples.body).toContainEqual(expect.objectContaining({ id: bread, in_stock: true }));
  });

  it("Couldn't find it keeps a staple on the list with a date", async () => {
    const me = await loginAs(TEST_USER);
    const rice = await addStaple(me, 'white-rice', false);

    await me.post(`/api/grocery/staples/${rice}/not-found`).expect(204);
    const res = await me.get('/api/grocery').expect(200);
    const entry = res.body.find((row: { name: string }) => row.name === 'White Rice');
    expect(entry.not_found_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Restocking and running out again starts fresh, without the old date.
    await me.patch(`/api/staples/${rice}`).send({ in_stock: true }).expect(204);
    await me.patch(`/api/staples/${rice}`).send({ in_stock: false }).expect(204);
    const again = await me.get('/api/grocery').expect(200);
    const fresh = again.body.find((row: { name: string }) => row.name === 'White Rice');
    expect(fresh.not_found_on).toBeNull();
  });

  it('adds a manual item, and Got it removes it', async () => {
    const me = await loginAs(TEST_USER);
    const created = await me.post('/api/grocery/items').send({ name: 'Paper towels' }).expect(201);

    const res = await me.get('/api/grocery').expect(200);
    expect(res.body).toContainEqual(
      expect.objectContaining({ source: 'manual', name: 'Paper towels', category: 'Other' })
    );

    await me.post(`/api/grocery/items/${created.body.id}/got-it`).expect(204);
    const after = await me.get('/api/grocery').expect(200);
    expect(after.body).not.toContainEqual(expect.objectContaining({ name: 'Paper towels' }));
  });

  it('adds a catalog ingredient for a recipe', async () => {
    const me = await loginAs(TEST_USER);
    // Recipe 3 is the demo's public Tomato Basil Soup.
    await me
      .post('/api/grocery/items')
      .send({ ingredient_id: await ingredientId('basil'), recipe_id: 3 })
      .expect(201);

    const res = await me.get('/api/grocery').expect(200);
    expect(res.body).toContainEqual(
      expect.objectContaining({
        source: 'recipe',
        name: 'Basil',
        category: 'Produce',
        recipe_name: 'Tomato Basil Soup',
      })
    );
  });

  it("Couldn't find it and Remove work on items", async () => {
    const me = await loginAs(TEST_USER);
    const created = await me.post('/api/grocery/items').send({ name: 'Saffron' }).expect(201);
    const id = created.body.id;

    await me.post(`/api/grocery/items/${id}/not-found`).expect(204);
    const res = await me.get('/api/grocery').expect(200);
    const entry = res.body.find((row: { name: string }) => row.name === 'Saffron');
    expect(entry.not_found_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await me.delete(`/api/grocery/items/${id}`).expect(204);
  });

  it('rejects an item with neither a name nor an ingredient', async () => {
    const me = await loginAs(TEST_USER);
    await me.post('/api/grocery/items').send({}).expect(400);
  });

  it("can't touch someone else's grocery list", async () => {
    const me = await loginAs(TEST_USER);
    const neighbor = await loginAs('neighbor');
    const item = await me.post('/api/grocery/items').send({ name: 'Coffee' }).expect(201);
    const staple = await addStaple(me, 'butter', false);

    await neighbor.post(`/api/grocery/items/${item.body.id}/got-it`).expect(404);
    await neighbor.delete(`/api/grocery/items/${item.body.id}`).expect(404);
    await neighbor.post(`/api/grocery/staples/${staple}/got-it`).expect(404);
    await neighbor.post(`/api/grocery/staples/${staple}/not-found`).expect(404);
  });
});
