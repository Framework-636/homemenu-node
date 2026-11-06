import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

afterAll(async () => {
  await pool.end();
});

// Log in through the real login route; the agent keeps the session cookie.
async function loginAs(username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'demo-password' }).expect(200);
  return agent;
}

function namesOf(body: { name: string }[]): string[] {
  return body.map((r) => r.name);
}

describe('per-user recipe visibility', () => {
  it('logged out: only public recipes are listed', async () => {
    const res = await request(app).get('/api/recipes').expect(200);
    const names = namesOf(res.body);
    expect(names).not.toContain('Secret Family Chili');
    expect(names).not.toContain("Neighbor's Secret Salsa");
  });

  it("logged in: my private recipe is listed, someone else's is not", async () => {
    const agent = await loginAs('demo');
    const res = await agent.get('/api/recipes').expect(200);
    const names = namesOf(res.body);
    expect(names).toContain('Secret Family Chili');
    expect(names).not.toContain("Neighbor's Secret Salsa");
    expect(names).toHaveLength(5);
  });

  it('logged in: I can open my own private recipe', async () => {
    const agent = await loginAs('demo');
    const res = await agent.get('/api/recipes/5').expect(200);
    expect(res.body.name).toBe('Secret Family Chili');
    expect(res.body.visibility).toBe('private');
  });

  it("logged in: someone else's private recipe is a 404", async () => {
    const agent = await loginAs('demo');
    await agent.get('/api/recipes/6').expect(404);
  });

  it('works the other way around too', async () => {
    const agent = await loginAs('neighbor');
    await agent.get('/api/recipes/6').expect(200);
    await agent.get('/api/recipes/5').expect(404);
  });
});
