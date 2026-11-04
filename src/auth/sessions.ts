import { createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../db.ts';

export const SESSION_COOKIE = 'sid';
export const SESSION_DAYS = 7;

// What the rest of the app knows about a logged-in user
export interface SessionUser {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'user';
}

interface SessionUserRow extends RowDataPacket, SessionUser {}

// The database stores a SHA-256 hash of the token, never the token itself
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Create a session and return the raw token to put in the cookie
export async function createSession(
  userId: number,
  ip: string,
  userAgent: string
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (id, user_id, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, NOW() + INTERVAL ? DAY)`,
    [hashToken(token), userId, ip, userAgent.slice(0, 255), SESSION_DAYS]
  );
  return token;
}

// Find the user for a token, or null if the session is missing or expired
export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const [rows] = await pool.query<SessionUserRow[]>(
    `SELECT u.id, u.username, u.display_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > NOW()`,
    [hashToken(token)]
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, username: row.username, display_name: row.display_name, role: row.role };
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = ?', [hashToken(token)]);
}