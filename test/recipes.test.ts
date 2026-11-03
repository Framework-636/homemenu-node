import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

// Close the database connections when all tests finish, so the process can exit
afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('reports the database as connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.database).toBe('connected');
  });
});

describe('GET /api/recipes', () => {
  it('lists only public recipes, sorted by name', async () => {
    const res = await request(app).get('/api/recipes');

    expect(res.status).toBe(200);
    expect(res.body.map((r: { name: string }) => r.name)).toEqual([
      'Grilled Lemon Salmon',
      'Overnight Oats',
      'Sheet Pan Chicken Fajitas',
      'Tomato Basil Soup',
    ]);
  });
});

describe('GET /api/recipes/:id', () => {
  it('returns a recipe with its ingredients, instructions and tags', async () => {
    const res = await request(app).get('/api/recipes/1');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Sheet Pan Chicken Fajitas');
    expect(res.body.ingredients).toHaveLength(6);
    expect(res.body.instructions).toHaveLength(3);
    expect(res.body.tags).toEqual(['one-pan', 'weeknight']);
  });

  it('returns 404 for a private recipe', async () => {
    const res = await request(app).get('/api/recipes/5');

    expect(res.status).toBe(404);
  });

  it('returns 404 for a recipe that does not exist', async () => {
    const res = await request(app).get('/api/recipes/999');

    expect(res.status).toBe(404);
  });

  it.each(['abc', '1.5', '0', '-3'])('returns 400 for invalid id "%s"', async (id) => {
    const res = await request(app).get(`/api/recipes/${id}`);

    expect(res.status).toBe(400);
  });
});
