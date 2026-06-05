import { HttpError } from '../errors.js';

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message });
  }

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  }));

  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
}
