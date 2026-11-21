// Creates a login. There's no sign-up page yet, so this is how an account is made.
//
//   npm run create-user -- <username> <email> "<Display Name>"
//
// It asks for the password (hidden) and stores only its bcrypt hash.
import { createInterface } from 'node:readline';
import bcrypt from 'bcryptjs';
import type { ResultSetHeader } from 'mysql2';
import { pool } from '../src/db.ts';

const [username, email, displayName] = process.argv.slice(2);
if (!username || !email || !displayName) {
  console.error('Usage: npm run create-user -- <username> <email> "<Display Name>"');
  process.exit(1);
}

// Ask a question without showing what is typed.
function askHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    // Replace readline's echo so the password never appears on screen.
    (rl as unknown as { _writeToOutput: () => void })._writeToOutput = () => {};
  });
}

try {
  const password = process.env.NEW_USER_PASSWORD ?? (await askHidden('Password (hidden): '));
  if (password.length < 10) {
    console.error('Use at least 10 characters. No account was created.');
    process.exitCode = 1;
  } else {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, display_name, email, password_hash) VALUES (?, ?, ?, ?)',
      [username, displayName, email, hash]
    );
    console.log(`Created ${username} (id ${result.insertId}).`);
  }
} catch (err) {
  if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
    console.error('That username or email is already taken. No account was created.');
  } else {
    console.error('Could not create the account:', err instanceof Error ? err.message : err);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
