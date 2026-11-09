import request from 'supertest';
import type { RowDataPacket } from 'mysql2';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

const WRITER_ID = 3; // the seed user only these tests touch

afterAll(async () => {
  // Clean up so repeated local runs don't pile up test recipes.
  await pool.query('DELETE FROM recipes WHERE user_id = ?', [WRITER_ID]);
  await pool.end();
});

async function loginAs(username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'demo-password' }).expect(200);
  return agent;
}

const validRecipe = {
  name: 'Test Pancakes',
  emoji: '🥞',
  category: 'Breakfast',
  servings: 4,
  prep_time: 5,
  cook_time: 10,
  ingredients: [
    { quantity: '1.5', unit: 'cup', ingredient: 'flour' },
    { quantity: '1', unit: '', ingredient: 'egg' },
  ],
  instructions: ['Whisk everything together.', 'Cook on a hot griddle.'],
  tags: ['Breakfast', 'quick', 'breakfast'],
};

type Agent = Awaited<ReturnType<typeof loginAs>>;

// Create a recipe as the given agent and return its new id.
async function createRecipe(agent: Agent, overrides: Record<string, unknown> = {}) {
  const res = await agent
    .post('/api/recipes')
    .send({ ...validRecipe, ...overrides })
    .expect(201);
  return res.body.id as number;
}

describe('POST /api/recipes', () => {
  it('requires login', async () => {
    await request(app).post('/api/recipes').send(validRecipe).expect(401);
  });

  it('rejects a recipe without a name', async () => {
    const agent = await loginAs('writer');
    const res = await agent
      .post('/api/recipes')
      .send({ ...validRecipe, name: '   ' })
      .expect(400);
    expect(res.body.issues[0].path).toBe('name');
  });

  it('rejects a category that is not in the list', async () => {
    const agent = await loginAs('writer');
    await agent
      .post('/api/recipes')
      .send({ ...validRecipe, category: 'Brunch' })
      .expect(400);
  });

  it('creates a recipe with its ingredients, steps and tags', async () => {
    const agent = await loginAs('writer');
    const id = await createRecipe(agent);

    const res = await agent.get(`/api/recipes/${id}`).expect(200);
    expect(res.body.name).toBe('Test Pancakes');
    expect(res.body.visibility).toBe('private'); // the default
    expect(res.body.ingredients.map((i: { ingredient: string }) => i.ingredient)).toEqual([
      'flour',
      'egg',
    ]);
    expect(res.body.instructions.map((s: { step_number: number }) => s.step_number)).toEqual([
      1, 2,
    ]);
    expect(res.body.tags).toEqual(['breakfast', 'quick']); // lowercased, duplicate removed
  });

  it('always saves the recipe as the logged-in user', async () => {
    const agent = await loginAs('writer');
    const id = await createRecipe(agent, { user_id: 1 }); // trying to create it in demo's account

    const [rows] = await pool.query<RowDataPacket[]>('SELECT user_id FROM recipes WHERE id = ?', [
      id,
    ]);
    expect(rows[0].user_id).toBe(WRITER_ID);
  });

  it('a new private recipe is hidden from other users', async () => {
    const writer = await loginAs('writer');
    const id = await createRecipe(writer);

    const demo = await loginAs('demo');
    await demo.get(`/api/recipes/${id}`).expect(404);
  });
});

describe('PUT /api/recipes/:id', () => {
  it('requires login', async () => {
    await request(app).put('/api/recipes/1').send(validRecipe).expect(401);
  });

  it('updates my recipe and replaces its ingredients, steps and tags', async () => {
    const writer = await loginAs('writer');
    const id = await createRecipe(writer);

    await writer
      .put(`/api/recipes/${id}`)
      .send({
        ...validRecipe,
        name: 'Better Pancakes',
        ingredients: [{ quantity: '2', unit: 'cup', ingredient: 'oat flour' }],
        instructions: ['Mix.', 'Rest 5 minutes.', 'Cook.'],
        tags: ['brunch'],
      })
      .expect(204);

    const res = await writer.get(`/api/recipes/${id}`).expect(200);
    expect(res.body.name).toBe('Better Pancakes');
    expect(res.body.ingredients).toHaveLength(1);
    expect(res.body.ingredients[0].ingredient).toBe('oat flour');
    expect(res.body.instructions).toHaveLength(3);
    expect(res.body.tags).toEqual(['brunch']);
  });

  it('rejects an invalid update', async () => {
    const writer = await loginAs('writer');
    const id = await createRecipe(writer);
    await writer
      .put(`/api/recipes/${id}`)
      .send({ ...validRecipe, servings: 0 })
      .expect(400);
  });

  it("can't edit someone else's private recipe", async () => {
    const writer = await loginAs('writer');
    const id = await createRecipe(writer);

    const demo = await loginAs('demo');
    await demo
      .put(`/api/recipes/${id}`)
      .send({ ...validRecipe, name: 'Hacked' })
      .expect(404);

    const res = await writer.get(`/api/recipes/${id}`).expect(200);
    expect(res.body.name).toBe('Test Pancakes'); // unchanged
  });

  it("can't edit someone else's public recipe either", async () => {
    const writer = await loginAs('writer');
    await writer
      .put('/api/recipes/1')
      .send({ ...validRecipe, name: 'Hacked' })
      .expect(404);

    const res = await request(app).get('/api/recipes/1').expect(200);
    expect(res.body.name).toBe('Sheet Pan Chicken Fajitas'); // unchanged
  });
});

describe('DELETE /api/recipes/:id', () => {
  it('deletes my recipe along with its ingredients', async () => {
    const writer = await loginAs('writer');
    const id = await createRecipe(writer);

    await writer.delete(`/api/recipes/${id}`).expect(204);
    await writer.get(`/api/recipes/${id}`).expect(404);

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS n FROM recipe_ingredients WHERE recipe_id = ?',
      [id]
    );
    expect(rows[0].n).toBe(0); // ON DELETE CASCADE removed them
  });

  it('returns 404 when deleting the same recipe twice', async () => {
    const writer = await loginAs('writer');
    const id = await createRecipe(writer);
    await writer.delete(`/api/recipes/${id}`).expect(204);
    await writer.delete(`/api/recipes/${id}`).expect(404);
  });

  it("can't delete someone else's recipe", async () => {
    const writer = await loginAs('writer');
    await writer.delete('/api/recipes/5').expect(404); // demo's private chili

    const demo = await loginAs('demo');
    await demo.get('/api/recipes/5').expect(200); // still there
  });
});
