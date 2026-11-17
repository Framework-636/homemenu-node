import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { RowDataPacket } from 'mysql2';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

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

async function clearTestAvoids() {
  await pool.query('DELETE FROM avoided_ingredients WHERE user_id IN (2, 3)');
}

describe('avoid list API', () => {
  beforeAll(clearTestAvoids);
  afterAll(async () => {
    await clearTestAvoids();
    await pool.end();
  });

  it('requires login', async () => {
    await request(app).get('/api/avoids').expect(401);
  });

  it('adds, lists and removes an avoided ingredient', async () => {
    const writer = await loginAs('writer');
    const sardines = await ingredientId('sardines');

    await writer.post('/api/avoids').send({ ingredient_id: sardines }).expect(201);

    const list = await writer.get('/api/avoids').expect(200);
    expect(list.body).toContainEqual(
      expect.objectContaining({ ingredient_id: sardines, name: 'Sardines' })
    );

    await writer.delete(`/api/avoids/${sardines}`).expect(204);
    const after = await writer.get('/api/avoids').expect(200);
    expect(after.body).not.toContainEqual(expect.objectContaining({ ingredient_id: sardines }));
  });

  it('avoids fresh tomatoes without avoiding canned ones', async () => {
    const writer = await loginAs('writer');
    const tomatoes = await ingredientId('tomatoes');
    const crushed = await ingredientId('crushed-tomatoes');

    await writer.post('/api/avoids').send({ ingredient_id: tomatoes }).expect(201);
    const list = await writer.get('/api/avoids').expect(200);
    const ids = list.body.map((row: { ingredient_id: number }) => row.ingredient_id);

    expect(ids).toContain(tomatoes);
    expect(ids).not.toContain(crushed);
  });

  it('rejects a duplicate with 409', async () => {
    const writer = await loginAs('writer');
    const shrimp = await ingredientId('shrimp');
    await writer.post('/api/avoids').send({ ingredient_id: shrimp }).expect(201);
    await writer.post('/api/avoids').send({ ingredient_id: shrimp }).expect(409);
  });

  it('rejects an unknown ingredient with 400', async () => {
    const writer = await loginAs('writer');
    await writer.post('/api/avoids').send({ ingredient_id: 999999 }).expect(400);
  });

  it("can't remove another user's avoid entry", async () => {
    const writer = await loginAs('writer');
    const neighbor = await loginAs('neighbor');
    const ham = await ingredientId('ham');
    await writer.post('/api/avoids').send({ ingredient_id: ham }).expect(201);

    // The neighbor isn't avoiding ham, so there's nothing of theirs to delete.
    await neighbor.delete(`/api/avoids/${ham}`).expect(404);

    // And writer's entry is still there.
    const list = await writer.get('/api/avoids').expect(200);
    expect(list.body).toContainEqual(expect.objectContaining({ ingredient_id: ham }));
  });
});
