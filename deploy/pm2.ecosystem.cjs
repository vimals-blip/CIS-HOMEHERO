// HomeHero — PM2 process file for production (runs the 4 Node processes).
// All run from backend/ (they need its node_modules); the frontend SSR server
// serves the prebuilt frontend/dist. Build the frontend first, then:
//   cd backend && pm2 start ../deploy/pm2.ecosystem.cjs
//
// Env (JWT_SECRET, ALLOWED_ORIGINS, DB_*, REDIS_URL, NODE_ENV) is read from
// backend/.env by each process; you can also set it in PM2's env block.
const path = require('node:path');
const cwd = path.resolve(__dirname, '..', 'backend');
const env = { NODE_ENV: 'production' };

module.exports = {
  apps: [
    { name: 'homehero-monolith',     cwd, script: 'server/api.js',                  env: { ...env, API_PORT: 4001 } },
    { name: 'homehero-auth-service', cwd, script: 'services/auth-service/server.js', env: { ...env, AUTH_SERVICE_PORT: 4101 } },
    { name: 'homehero-gateway',      cwd, script: 'services/gateway/server.js',      env: { ...env, GATEWAY_PORT: 4000 } },
    { name: 'homehero-frontend',     cwd, script: 'server/prod-server.js',           env: { ...env, PORT: 4174 } },
  ],
};
