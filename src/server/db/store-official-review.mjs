import 'server-only';
import {createOfficialReview} from '../standings/official-review.mjs';
import {canonicalJson} from '../standings/batch.mjs';

/** Recompute review/gate before insertion; evidence and activation are one atomic row. */
export async function storeOfficialReview(db, options, {now = Date.now()} = {}) {
  const row = createOfficialReview(options);
  if (!Number.isFinite(now) || options.now > now) throw new Error('OFFICIAL_REVIEW_INVALID_TIME');
  // An activation prepared earlier may have expired before its first write.
  if (row.activated && !createOfficialReview({...options, now}).activated) throw new Error('OFFICIAL_REVIEW_EXPIRED');
  try {
    const {error} = await db.from('standings_official_reviews').insert(row);
    if (!error) return {id: row.id, status: row.status, activated: row.activated, replay: false};
    if (error.code !== '23505') throw new Error('OFFICIAL_REVIEW_STORAGE_FAILED');
    const {data, error: readError} = await db.from('standings_official_reviews').select('*').eq('id', row.id).single();
    if (readError || !data) throw new Error('OFFICIAL_REVIEW_STORAGE_FAILED');
    const instant = v => v instanceof Date ? v.getTime() : Date.parse(v);
    if (!Object.entries(row).every(([k, v]) => ['reviewed_at', 'observed_at'].includes(k) ? instant(data[k]) === instant(v) : canonicalJson(data[k]) === canonicalJson(v))) throw new Error('OFFICIAL_REVIEW_IDEMPOTENCY_CONFLICT');
    return {id: row.id, status: row.status, activated: row.activated, replay: true};
  } catch (error) {
    throw new Error(error.message === 'OFFICIAL_REVIEW_IDEMPOTENCY_CONFLICT' ? error.message : 'OFFICIAL_REVIEW_STORAGE_FAILED');
  }
}
