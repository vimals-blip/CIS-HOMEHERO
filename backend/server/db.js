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
  // Default raised 10→25 per process for production load. With ~4 backend
  // processes that's ~100 connections — keep MySQL max_connections well above
  // (processes × limit) plus headroom. Tune per instance via env.
  DB_CONNECTION_LIMIT = '25',
} = process.env;

// dateStrings: true — returns DATE/DATETIME columns as plain strings (e.g. "2026-06-05")
// instead of JavaScript Date objects, which get JSON-serialized to ISO UTC strings
// and cause date-shift bugs due to timezone offset.
const sharedPoolOpts = {
  waitForConnections: true,
  connectionLimit: Number(DB_CONNECTION_LIMIT),
  queueLimit: 0, // unbounded wait queue; requests wait rather than erroring
  enableKeepAlive: true, // keep idle TCP conns alive so they aren't silently dropped
  keepAliveInitialDelay: 10_000,
  decimalNumbers: true,
  dateStrings: true,
};

const pool = DATABASE_URL
  ? mysql.createPool({ uri: DATABASE_URL, ...sharedPoolOpts })
  : mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ...sharedPoolOpts,
    });

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export default pool;
