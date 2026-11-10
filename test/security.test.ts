import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.ts';
import { pool } from '../src/db.ts';

afterAll(async () => {
  await pool.end();
});

describe('security headers', () => {
  it('sends helmet headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('login rate limiting', () => {
  it('blocks an address after 10 failed logins, even with the right password', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'wrong-password' })
        .expect(401);
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'demo', password: 'demo-password' })
      .expect(429);
    expect(res.body.error).toMatch(/too many/i);
  }, 15_000); // 11 bcrypt checks take a few seconds; allow up to 15
});
