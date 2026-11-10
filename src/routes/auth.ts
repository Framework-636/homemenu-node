import { Router, type CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../db.ts';
import { requireUser } from '../auth/middleware.ts';
import { createSession, deleteSession, SESSION_COOKIE, SESSION_DAYS } from '../auth/sessions.ts';
import { rateLimit } from 'express-rate-limit';

interface LoginUserRow extends RowDataPacket {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'user';
  password_hash: string;
}

const loginBody = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
});

// Slow down password guessing: after 10 failed logins from one IP address
// in 15 minutes, refuse further login attempts until the window passes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // only failed attempts count
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

// Compared against when the username doesn't exist, so a failed login
// takes the same time whether or not the user is real
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const router = Router();

// POST /api/auth/login - check credentials, start a session, set the cookie
router.post('/login', loginLimiter, async (req, res, next) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const { username, password } = parsed.data;

  try {
    const [rows] = await pool.query<LoginUserRow[]>(
      `SELECT id, username, display_name, role, password_hash
       FROM users
       WHERE username = ? OR email = ?`,
      [username, username]
    );
    const user = rows[0];

    const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = await createSession(user.id, req.ip ?? '', req.get('user-agent') ?? '');
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    res.cookie(SESSION_COOKIE, token, {
      ...cookieOptions,
      maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    });
    res.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - end the session and clear the cookie
router.post('/logout', async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  try {
    if (typeof token === 'string' && token.length > 0) {
      await deleteSession(token);
    }
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - who is logged in?
router.get('/me', requireUser, (req, res) => {
  res.json({ user: res.locals.user });
});

export default router;
