/**
 * Wraps an async route handler and forwards any thrown error to Express's
 * next(err) so the global error handler can respond consistently.
 */
export function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/**
 * Mask a phone number to last 4 digits for customer-facing display.
 * e.g. "9876543210" → "******3210"
 */
export function maskPhone(phone) {
  if (!phone) return null;
  const str = String(phone);
  if (str.length <= 4) return str;
  return '******' + str.slice(-4);
}
