import 'server-only';
import {createOfficialReview} from './official-review.mjs';
import {storeOfficialReview} from '../db/store-official-review.mjs';

/** Explicit file-based operation; simulation never constructs a database client. */
export async function runManualReview({request, policy, mode, getDb, now = Date.now()}) {
  if (!['--dry-run', '--apply'].includes(mode) || !request ||
    Object.keys(request).sort().join(',') !== 'batch,evidence,id,requestActivation,reviewedAt' ||
    typeof request.requestActivation !== 'boolean' || typeof request.reviewedAt !== 'string' ||
    !/T.*(Z|[+-]\d{2}:\d{2})$/.test(request.reviewedAt) ||
    !Number.isFinite(Date.parse(request.reviewedAt)) || Date.parse(request.reviewedAt) > now || !Number.isFinite(now)) {
    throw new Error('OFFICIAL_REVIEW_INVALID_REQUEST');
  }
  if (!policy || Object.keys(policy).sort().join(',') !== 'evidenceTtlMs,resultsTtlMs,reviewTtlMs' ||
    !Object.values(policy).every(v => Number.isSafeInteger(v) && v > 0)) throw new Error('OFFICIAL_REVIEW_INVALID_POLICY');
  const options = {id: request.id, batch: request.batch, evidence: request.evidence,
    requestActivation: request.requestActivation, policy, now: Date.parse(request.reviewedAt)};
  const review = createOfficialReview(options);
  // Fixed review time supports exact retries, but cannot bypass present freshness.
  if (review.activated && !createOfficialReview({...options, now}).activated) throw new Error('OFFICIAL_REVIEW_EXPIRED');
  const result = mode === '--apply' ? await storeOfficialReview(await getDb(), options) : null;
  return {mode, id: review.id, batch_id: review.batch_id, payload_hash: review.batch_payload_hash,
    status: review.status, activation_requested: request.requestActivation,
    eligible_for_activation: review.activated, stored: result !== null,
    activated: result?.activated ?? false, reasons: review.payload.reasons,
    differences: review.payload.differences, reviewed_at: review.reviewed_at, policy: review.payload.policy, result};
}
