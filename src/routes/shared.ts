import type { RowDataPacket } from 'mysql2';
import type { ZodError } from 'zod';
import { pool } from '../db.ts';

// Turn Zod's validation errors into a consistent 400 response body.
export function validationError(error: ZodError, label: string) {
  return {
    error: label,
    issues: error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}

// MariaDB reports a UNIQUE / PRIMARY key violation with this code.
export function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: string }).code === 'ER_DUP_ENTRY';
}

// A user may use shared catalog ingredients and ones they created themselves.
export async function canUseIngredient(userId: number, ingredientId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM ingredients WHERE id = ? AND (created_by IS NULL OR created_by = ?)',
    [ingredientId, userId]
  );
  return rows.length > 0;
}

// 'YYYY-MM-DD' in UTC, shifted by a number of days.
export function utcDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

// The browser sends its own date, because the server's clock is UTC, where
// 7 pm in St. Louis is already tomorrow. Allowing one day past UTC accepts
// every time zone's "today" while still refusing made-up future dates.
export function isFutureDate(date: string): boolean {
  return date > utcDate(1);
}
