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
