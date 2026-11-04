import type { RequestHandler } from 'express';
import { findSessionUser, SESSION_COOKIE } from './sessions.ts';

// Runs on every request: if a valid session cookie is present, attach the user
export const loadUser: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token.length > 0) {
    try {
      res.locals.user = await findSessionUser(token);
    } catch (err) {
      next(err);
      return;
    }
  }
  next();
};

// Put this on any route that requires login
export const requireUser: RequestHandler = (req, res, next) => {
  if (!res.locals.user) {
    res.status(401).json({ error: 'Not logged in' });
    return;
  }
  next();
};