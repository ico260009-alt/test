// Wraps an async Express route handler so any thrown error / rejected promise is
// forwarded to next(err) automatically. Every route in this app already has its own
// try/catch, so this is a defense-in-depth safety net (not a replacement) — it protects
// against the next handler someone adds without one, and against errors thrown by
// middleware that runs before the handler's own try/catch is entered.
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
