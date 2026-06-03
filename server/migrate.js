import fs from 'node:fs/promises';
import path from 'node:path';
import pool from './db.js';

// Run a SQL file: split on semicolons and execute each statement
async function runSqlFile(filePath) {
  const sql = await fs.readFile(filePath, 'utf8');
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((stmt) => stmt.trim())
    .filter(Boolean);

  console.log(`Running ${statements.length} statements from ${path.basename(filePath)}...`);
  for (const statement of statements) {
    console.log('Executing:', statement.split('\n')[0].trim().slice(0, 120));
    try {
      await pool.query(statement);
    } catch (err) {
      // Warn on non-fatal errors (e.g. duplicate index), but re-throw fatal ones
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_FIELDNAME') {
        console.warn(`  SKIP (already exists): ${err.message}`);
      } else {
        throw err;
      }
    }
  }
}

const schemaFile = path.resolve(process.cwd(), 'server/schema.sql');
await runSqlFile(schemaFile);
console.log('MySQL base schema migration completed.');

const migration001 = path.resolve(process.cwd(), 'server/migrations/001_new_tables.sql');
await runSqlFile(migration001);
console.log('Migration 001 (new tables) completed.');

console.log('All migrations completed successfully.');
await pool.end();
