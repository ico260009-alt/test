// The admin panel (src/pages/Admin/views/AdminSecurity.jsx) lets admins add/remove IP
// addresses from public.ip_blacklist and displays it as a live security control - but
// nothing server-side previously read that table, so blacklisting an IP had no actual
// effect. This closes that gap: refreshes a cached blacklist set periodically and exposes
// a middleware that rejects requests from blacklisted IPs before they reach any route.
//
// The blacklist is cached (rather than queried on every request) since it changes rarely
// and this runs on every single request - a 30s staleness window is an acceptable tradeoff
// for not adding a DB round-trip to every request's hot path.

const REFRESH_INTERVAL_MS = 30_000;
let cachedSet = new Set();
let lastRefreshAttempt = 0;
let refreshing = null;

async function refresh(supabaseAdmin) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const { data, error } = await supabaseAdmin.from('ip_blacklist').select('ip_address');
      if (!error && data) {
        cachedSet = new Set(data.map((row) => row.ip_address));
      }
    } catch (err) {
      console.error('Failed to refresh ip_blacklist cache (leaving previous cache in place):', err.message);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export function ipBlacklistMiddleware(supabaseAdmin) {
  return async (req, res, next) => {
    const now = Date.now();
    if (now - lastRefreshAttempt > REFRESH_INTERVAL_MS) {
      lastRefreshAttempt = now;
      // Don't block the request on this - use whatever's cached and refresh in the background.
      refresh(supabaseAdmin);
    }

    const ip = req.ip === '::1' ? '127.0.0.1' : req.ip;
    if (ip && cachedSet.has(ip)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}
