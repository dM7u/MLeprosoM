import 'server-only';
import {validateStandingsBatch, canonicalJson} from '../standings/batch.mjs';
const timestamp = value => value instanceof Date ? value.getTime() : Date.parse(value);

/** One immutable row per batch. Duplicate IDs are retries only for identical content. */
export async function storeStandingsBatch(db, batch, {now = Date.now()} = {}) {
  const row = validateStandingsBatch(batch);
  if (!Number.isFinite(now) || timestamp(row.generated_at) > now) throw new Error('INVALID_STANDINGS_BATCH_TIME');
  try {
    const {error} = await db.from('standings_batches').insert(row);
    if (!error) return {id: row.id, status: row.status, stored: true, replay: false};
    if (error.code !== '23505') throw new Error('STANDINGS_STORAGE_FAILED');
    const {data, error: readError} = await db.from('standings_batches').select('*').eq('id', row.id).single();
    if (readError || !data) throw new Error('STANDINGS_STORAGE_FAILED');
    // PostgreSQL may format timestamptz differently. Compare instants, and JSON canonically.
    const same = Object.entries(row).every(([key, value]) => ['generated_at', 'data_as_of'].includes(key)
      ? (value === null ? data[key] === null : timestamp(data[key]) === timestamp(value))
      : canonicalJson(data[key]) === canonicalJson(value));
    if (!same) throw new Error('STANDINGS_IDEMPOTENCY_CONFLICT');
    return {id: row.id, status: row.status, stored: false, replay: true};
  } catch (error) {
    throw new Error(error.message === 'STANDINGS_IDEMPOTENCY_CONFLICT' ? error.message : 'STANDINGS_STORAGE_FAILED');
  }
}
