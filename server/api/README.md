Production API
--------------

This folder provides the production API entrypoint. It re-uses `server/api.js` which
starts an Express server exposing endpoints under `/api/*`.

How to run:

1. Ensure environment variables are set (see root `.env`).
2. Start API only: `node server/api/index.js` or `npm run api`.

Notes:
- The project also provides `server/prod-server.js` to serve the built frontend and API.
- For Supabase admin operations (create admin user), set `SUPABASE_SERVICE_ROLE_KEY` and run `npm run create-admin`.
