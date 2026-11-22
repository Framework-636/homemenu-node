// Where the tests keep their data: a database of their own, next to the real one.
// DB_NAME=homemenu  ->  the tests use homemenu_test
export function testDatabaseName(): string {
  const base = process.env.DB_NAME;
  if (!base) throw new Error('Missing environment variable: DB_NAME');
  return base.endsWith('_test') ? base : `${base}_test`;
}
