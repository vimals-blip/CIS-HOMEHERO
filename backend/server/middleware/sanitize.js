function stripHtml(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
}

function sanitizeValue(v) {
  if (typeof v === 'string') return stripHtml(v);
  if (Array.isArray(v)) return v.map(sanitizeValue);
  if (v && typeof v === 'object') return sanitizeObj(v);
  return v;
}

function sanitizeObj(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    out[key] = sanitizeValue(obj[key]);
  }
  return out;
}

export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObj(req.body);
  }
  next();
}
