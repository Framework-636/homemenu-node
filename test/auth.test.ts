import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/login', () => {
  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'demo', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  it('gives an unknown user the same 401 message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  it('rejects a missing password with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'demo' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });
});

describe('login → me → logout', () => {
  it('keeps the user logged in until logout', async () => {
    const agent = request.agent(app);

    const login = await agent
      .post('/api/auth/login')
      .send({ username: 'demo', password: 'demo-password' });
    expect(login.status).toBe(200);
    expect(login.body.user.username).toBe('demo');
    expect(login.body.user).not.toHaveProperty('password_hash');
    expect(String(login.headers['set-cookie'])).toMatch(/HttpOnly/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('demo');

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });
});