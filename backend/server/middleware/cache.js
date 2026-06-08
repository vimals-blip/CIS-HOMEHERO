// Response cache for hot, rarely-changing public GET endpoints (services, CMS
// banners/settings/cities/pages). At launch scale these are requested on nearly
// every page load; caching collapses thousands of identical DB reads into one
// per TTL window.
//
// Backed by Redis when REDIS_URL is set (shared + consistent across instances),
// else an in-process Map (per-instance, still effective). TTLs are short, so
// admin edits become visible within the window without explicit invalidation —
// but writes can call `bustCache(prefix)` for immediacy.
const REDIS_URL = process.env.REDIS_URL;
const PREFIX = 'cache:';

let redis = null;
if (REDIS_URL) {
  (async () => {
    try {
      const { default: Redis } = await import('ioredis');
      redis = new Redis(REDIS_URL);
      redis.on('error', () => { /* fall back to memory on transient errors */ });
      console.log('Response cache: Redis-backed');
    } catch (err) {
      console.error('Response cache: Redis unavailable, using in-memory:', err?.message);
    }
  })();
}

// In-memory fallback store: key → { body, expires }
const mem = new Map();

async function cacheGet(key) {
  if (redis) {
    try {
      const v = await redis.get(PREFIX + key);
      return v ? JSON.parse(v) : null;
    } catch { /* fall through to memory */ }
  }
  const hit = mem.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) { mem.delete(key); return null; }
  return hit.body;
}

async function cacheSet(key, body, ttlSec) {
  if (redis) {
    try { await redis.set(PREFIX + key, JSON.stringify(body), 'EX', ttlSec); return; }
    catch { /* fall through to memory */ }
  }
  mem.set(key, { body, expires: Date.now() + ttlSec * 1000 });
}

// Express middleware: cache the JSON body of successful GET responses by URL.
export function cacheMiddleware(ttlSeconds = 60) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    try {
      const cached = await cacheGet(key);
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch { /* ignore cache read errors */ }

    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, body, ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

// Best-effort invalidation by URL-prefix (e.g. "/api/v1/services").
export async function bustCache(prefix) {
  if (redis) {
    try {
      const keys = await redis.keys(`${PREFIX}${prefix}*`);
      if (keys.length) await redis.del(keys);
    } catch { /* ignore */ }
  }
  for (const k of mem.keys()) if (k.startsWith(prefix)) mem.delete(k);
}
