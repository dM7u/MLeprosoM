import 'server-only';
import {canonicalJson, validateStandingsBatch} from '../standings/batch.mjs';
import {createOfficialReview} from '../standings/official-review.mjs';
import {standingsSnapshotView} from '../standings/snapshot-view.mjs';

const instant = value => value instanceof Date ? value.getTime() : Date.parse(value);
const batchColumns = ['id', 'provider', 'competition_external_id', 'season_external_id', 'contract_version', 'engine_version', 'input_hash', 'review_hash', 'payload_hash', 'generated_at', 'data_as_of', 'status', 'payload'];
const sameInstant = (a, b) => a === null || b === null ? a === b : Number.isFinite(instant(a)) && instant(a) === instant(b);

// SQL timestamps may differ in spelling from the original immutable engine input.
function hydrateBatch(row) {
  const stored = Object.fromEntries(batchColumns.map(k => [k, row[k]]));
  const first = stored.payload?.snapshots?.[0];
  if (!first || !sameInstant(row.generated_at, first.generated_at) || !sameInstant(row.data_as_of, first.data_as_of)) throw new Error('INVALID_STORED_BATCH');
  stored.generated_at = first.generated_at;
  stored.data_as_of = first.data_as_of;
  return validateStandingsBatch(stored);
}

function hydrateReview(row, batch, now) {
  const reviewedAt = instant(row.reviewed_at);
  if (!Number.isFinite(reviewedAt) || reviewedAt > now) throw new Error('INVALID_STORED_REVIEW');
  const expected = createOfficialReview({id: row.id, batch, evidence: row.payload?.evidence,
    requestActivation: row.payload?.activation_requested, policy: row.payload?.policy, now: reviewedAt});
  if (!Object.entries(expected).every(([k, v]) => ['reviewed_at', 'observed_at'].includes(k) ? sameInstant(row[k], v) : canonicalJson(row[k]) === canonicalJson(v))) throw new Error('INVALID_STORED_REVIEW');
  return expected;
}

/** Private backend read only. Bounded history fails closed instead of truncating approvals. */
export async function readStandings(db, {scope, selection, policy, now = Date.now()}) {
  if (!policy || !Number.isFinite(policy.evidenceTtlMs) || policy.evidenceTtlMs <= 0) throw new Error('INVALID_FRESHNESS_POLICY');
  const base = {scope, selection, now, resultsTtlMs: policy.resultsTtlMs, reviewTtlMs: policy.reviewTtlMs};
  const empty = standingsSnapshotView(base); // Validate caller inputs before catching DB failures.
  const unavailable = code => ({...standingsSnapshotView({...base, refreshFailed: true}), batch_id: null, official_review_id: null, read_issues: [code]});
  try {
    const {data: batches, error} = await db.from('standings_batches')
      .select('id,provider,competition_external_id,season_external_id,data_as_of,generated_at,status')
      .eq('provider', scope.provider).eq('competition_external_id', scope.competition_id).eq('season_external_id', scope.season_id)
      .order('data_as_of', {ascending: false, nullsFirst: false}).order('generated_at', {ascending: false}).limit(101);
    if (error || !Array.isArray(batches)) return unavailable('storage_unavailable');
    if (batches.length > 100) return unavailable('history_limit_exceeded');
    if (!batches.length) return {...empty, batch_id: null, official_review_id: null, read_issues: []};
    if (new Set(batches.map(b => b.id)).size !== batches.length || batches.some(b => b.provider !== scope.provider || b.competition_external_id !== scope.competition_id || b.season_external_id !== scope.season_id || !Number.isFinite(instant(b.generated_at)) || instant(b.generated_at) > now || (b.data_as_of !== null && (!Number.isFinite(instant(b.data_as_of)) || instant(b.data_as_of) > instant(b.generated_at))))) return unavailable('invalid_batch_metadata');
    const {data: reviews, error: reviewError} = await db.from('standings_official_reviews').select('*').in('batch_id', batches.map(b => b.id)).limit(501);
    if (reviewError || !Array.isArray(reviews)) return unavailable('reviews_unavailable');
    if (reviews.length > 500) return unavailable('history_limit_exceeded');
    if (new Set(reviews.map(r => r.id)).size !== reviews.length || reviews.some(r => !batches.some(b => b.id === r.batch_id) || !Number.isFinite(instant(r.reviewed_at)) || instant(r.reviewed_at) > now)) return unavailable('invalid_review_metadata');
    const sorted = [...batches].sort((a, b) => (b.data_as_of === null ? -Infinity : instant(b.data_as_of)) - (a.data_as_of === null ? -Infinity : instant(a.data_as_of)) || instant(b.generated_at) - instant(a.generated_at));
    const readIssues = [];
    const newestAttempt = Math.max(...batches.map(b => instant(b.generated_at)));
    for (const metadata of sorted) {
      if (metadata.status !== 'complete') {readIssues.push('incomplete_batch'); continue;}
      const history = reviews.filter(r => r.batch_id === metadata.id).sort((a, b) => instant(b.reviewed_at) - instant(a.reviewed_at));
      if (!history.length) {readIssues.push('unreviewed_batch'); continue;}
      const latest = history.filter(r => instant(r.reviewed_at) === instant(history[0].reviewed_at));
      // A tie is never broken by UUID or fetch order.
      if (latest.some(r => r.review_hash !== latest[0].review_hash || r.status !== latest[0].status || r.activated !== latest[0].activated)) return unavailable('ambiguous_latest_review');
      const {data: stored, error: batchError} = await db.from('standings_batches').select('*').eq('id', metadata.id).single();
      if (batchError || !stored) return unavailable('batch_unavailable');
      const batch = hydrateBatch(stored);
      if (batch.id !== metadata.id || batch.provider !== scope.provider || batch.competition_external_id !== scope.competition_id || batch.season_external_id !== scope.season_id || !sameInstant(batch.generated_at, metadata.generated_at) || !sameInstant(batch.data_as_of, metadata.data_as_of) || batch.status !== metadata.status) return unavailable('invalid_batch_metadata');
      const review = hydrateReview(latest[0], batch, now);
      if (!review.activated) {readIssues.push('latest_review_denied'); continue;}
      if (sorted.some(other => other.id !== metadata.id && sameInstant(other.data_as_of, metadata.data_as_of) && sameInstant(other.generated_at, metadata.generated_at))) return unavailable('ambiguous_batch_order');
      const snapshot = batch.payload.snapshots.find(s => canonicalJson(s.selection) === canonicalJson(selection));
      if (!snapshot) return unavailable('selection_unavailable');
      // Concurrent new reviews must not make us expose a now-revoked older approval.
      const {data: rechecked, error: recheckError} = await db.from('standings_official_reviews').select('id,review_hash,reviewed_at,status,activated').eq('batch_id', batch.id)
        .order('reviewed_at', {ascending: false}).limit(2);
      if (recheckError || !Array.isArray(rechecked) || !rechecked.length || rechecked.some(r => !sameInstant(r.reviewed_at, review.reviewed_at) && instant(r.reviewed_at) >= instant(review.reviewed_at)) || !rechecked.some(r => r.id === review.id) || rechecked.filter(r => sameInstant(r.reviewed_at, review.reviewed_at)).some(r => r.review_hash !== review.review_hash || r.status !== review.status || r.activated !== review.activated)) return unavailable('review_changed_during_read');
      const view = standingsSnapshotView({...base, candidate: snapshot, refreshFailed: readIssues.length > 0 || newestAttempt > instant(batch.generated_at),
        resultsTtlMs: Math.min(policy.resultsTtlMs, review.payload.policy.resultsTtlMs), reviewTtlMs: Math.min(policy.reviewTtlMs, review.payload.policy.reviewTtlMs)});
      const evidenceStale = now - instant(review.observed_at) >= Math.min(policy.evidenceTtlMs, review.payload.policy.evidenceTtlMs);
      if (evidenceStale) {view.status = 'stale'; view.label = 'Tabla provisional desactualizada'; view.warnings.push('stale_evidence');}
      return {...view, teams: batch.payload.input.teams.map(t => ({id: t.id, groups: {...t.groups}})),
        selections: batch.payload.snapshots.map(s => ({...s.selection})),
        batch_id: batch.id, official_review_id: review.id, evidence_as_of: review.observed_at, read_issues: [...new Set(readIssues)]};
    }
    return {...empty, batch_id: null, official_review_id: null, read_issues: [...new Set(readIssues)]};
  } catch { return unavailable('invalid_or_unavailable_storage'); }
}
