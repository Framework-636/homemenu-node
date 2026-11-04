import type { SessionUser } from '../auth/sessions.ts';

declare global {
  namespace Express {
    interface Locals {
      user?: SessionUser | null;
    }
  }
}

export {};
