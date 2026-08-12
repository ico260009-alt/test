const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

// Sends a 400 and returns true if `value` isn't a valid UUID string; returns false
// (and sends nothing) if it's valid, so callers can `if (rejectIfNotUuid(...)) return;`.
export function rejectIfNotUuid(res, value, fieldName) {
  if (!isUuid(value)) {
    res.status(400).json({ error: `${fieldName} must be a valid UUID` });
    return true;
  }
  return false;
}
