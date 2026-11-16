import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { RowDataPacket } from 'mysql2';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

// writer (id 3) does the edits; neighbor (id 2) checks they can't touch writer's staples.
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

async function clearTestStaples() {
  await pool.query('DELETE FROM kitchen_items WHERE user_id IN (2, 3)');
}

describe('staples API', () => {
  beforeAll(clearTestStaples); // start clean even if a previous run crashed
  afterAll(async () => {
    await clearTestStaples();
    await pool.end();
  });

  it('requires login', async () => {
    await request(app).get('/api/staples').expect(401);
  });

  it('adds, lists, marks out of stock and removes a staple', async () => {
    const writer = await loginAs('writer');
    const milk = await ingredientId('milk');

    const created = await writer.post('/api/staples').send({ ingredient_id: milk }).expect(201);
    const stapleId = created.body.id;

    const list = await writer.get('/api/staples').expect(200);
    expect(list.body).toContainEqual(
      expect.objectContaining({ id: stapleId, name: 'Milk', in_stock: true })
    );

    await writer.patch(`/api/staples/${stapleId}`).send({ in_stock: false }).expect(204);
    const after = await writer.get('/api/staples').expect(200);
    expect(after.body).toContainEqual(expect.objectContaining({ id: stapleId, in_stock: false }));

    await writer.delete(`/api/staples/${stapleId}`).expect(204);
    const gone = await writer.get('/api/staples').expect(200);
    expect(gone.body).not.toContainEqual(expect.objectContaining({ id: stapleId }));
  });

  it('returns 204 when setting the same stock value again', async () => {
    const writer = await loginAs('writer');
    const eggs = await ingredientId('eggs');
    const created = await writer.post('/api/staples').send({ ingredient_id: eggs }).expect(201);

    // New staples start in stock, so this changes nothing but should still succeed.
    await writer.patch(`/api/staples/${created.body.id}`).send({ in_stock: true }).expect(204);
  });

  it('rejects a duplicate with 409', async () => {
    const writer = await loginAs('writer');
    const butter = await ingredientId('butter');
    await writer.post('/api/staples').send({ ingredient_id: butter }).expect(201);
    await writer.post('/api/staples').send({ ingredient_id: butter }).expect(409);
  });

  it('rejects an unknown ingredient with 400', async () => {
    const writer = await loginAs('writer');
    await writer.post('/api/staples').send({ ingredient_id: 999999 }).expect(400);
  });

  it("returns 404 for someone else's staple", async () => {
    const writer = await loginAs('writer');
    const neighbor = await loginAs('neighbor');
    const salt = await ingredientId('salt');
    const created = await writer.post('/api/staples').send({ ingredient_id: salt }).expect(201);

    await neighbor.patch(`/api/staples/${created.body.id}`).send({ in_stock: false }).expect(404);
    await neighbor.delete(`/api/staples/${created.body.id}`).expect(404);
  });

  it('searches the ingredient catalog', async () => {
    const writer = await loginAs('writer');
    const res = await writer.get('/api/ingredients?q=tomato').expect(200);
    const names = res.body.map((row: { name: string }) => row.name);
    expect(names).toContain('Tomatoes');
    expect(names).toContain('Crushed Tomatoes');
  });
});
