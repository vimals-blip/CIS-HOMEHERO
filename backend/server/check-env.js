import dotenv from 'dotenv';
import path from 'node:path';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
];
for (const p of envPaths) dotenv.config({ path: p });

const required = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'DB_PASSWORD',
  'JWT_SECRET',
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length === 0) {
  console.log('Environment check passed. All required variables are present.');
  process.exit(0);
}

console.error('Missing required environment variables: ' + missing.join(', '));
console.error('Please add them to the root .env or server/.env before proceeding.');
process.exit(2);
