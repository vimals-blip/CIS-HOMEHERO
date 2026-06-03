import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const {
  DATABASE_URL,
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'homehero',
  DB_CONNECTION_LIMIT = '10',
} = process.env;

// dateStrings: true — returns DATE/DATETIME columns as plain strings (e.g. "2026-06-05")
// instead of JavaScript Date objects, which get JSON-serialized to ISO UTC strings
// and cause date-shift bugs due to timezone offset.
const pool = DATABASE_URL
  ? mysql.createPool({ uri: DATABASE_URL, dateStrings: true, decimalNumbers: true })
  : mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: Number(DB_CONNECTION_LIMIT),
      decimalNumbers: true,
      dateStrings: true,
    });

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export default pool;
