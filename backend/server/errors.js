/**
 * Typed HTTP error thrown by controllers.
 * asyncHandler catches it and forwards to the global error handler,
 * which inspects statusCode to send the right HTTP response.
 */
export class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const BadRequest  = (code, msg) => new HttpError(400, code, msg);
export const Unauthorized = (msg = 'Authentication required.')    => new HttpError(401, 'UNAUTHENTICATED', msg);
export const Forbidden   = (msg = 'Forbidden.')                   => new HttpError(403, 'FORBIDDEN', msg);
export const NotFound    = (msg = 'Resource not found.')          => new HttpError(404, 'NOT_FOUND', msg);
export const Conflict    = (code, msg)                            => new HttpError(409, code, msg);
