import 'server-only';

/** Caller supplies a validated snapshot and an operation-specific TTL. No polling. */
export function dataState({ data, fetchedAt, ttlMs, refreshFailed = false, partial = false, now = Date.now() }) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isFinite(now)) throw new Error('INVALID_FRESHNESS_POLICY');
  const present = data !== null && data !== undefined && (!Array.isArray(data) || data.length > 0);
  if (!present) return {status:refreshFailed ? 'error' : 'empty',label:'Sin datos',data:null,updatedAt:null,partial:false};
  const timestamp = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
  const validTimestamp = Number.isFinite(timestamp) && timestamp <= now;
  const stale = refreshFailed || !validTimestamp || now - timestamp >= ttlMs;
  return {status:stale ? 'stale' : partial ? 'partial' : 'fresh',label:stale ? 'Datos desactualizados' : partial ? 'Datos parciales' : 'Datos actualizados',data,updatedAt:validTimestamp ? fetchedAt : null,partial};
}
