import 'server-only';
import {dataState} from '../data-state.mjs';

const text = value => typeof value === 'string' && value.trim().length > 0;
const time = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
const scopeFields = ['provider', 'competition_id', 'season_id'];
const selectionFields = ['kind', 'tournament', 'group'];

function validSelection(selection) {
  return selection && (selection.kind === 'annual'
    ? selection.tournament === undefined && selection.group === undefined
    : selection.kind === 'tournament' && text(selection.tournament) && (selection.group === undefined || text(selection.group)));
}

// Inputs are snapshots produced/validated by the engine, not arbitrary HTTP JSON.
function rejection(snapshot, scope, selection, now) {
  if (!snapshot) return null;
  if (scopeFields.some(key => snapshot.scope?.[key] !== scope[key]) || selectionFields.some(key => snapshot.selection?.[key] !== selection[key])) return 'scope_mismatch';
  if (snapshot.state === 'not_started' && snapshot.rows?.length === 0 && snapshot.issues?.length === 0) return 'not_started';
  if (snapshot.state !== 'complete' || !Array.isArray(snapshot.rows) || !snapshot.rows.length || !Array.isArray(snapshot.issues) || snapshot.issues.length) return 'incomplete_snapshot';
  if (snapshot.origin !== 'own_calculation' || snapshot.adjustments_status !== 'unverified' || snapshot.rows.some(row => row.official_position !== null)) return 'unsupported_provenance';
  const observed = time(snapshot.data_as_of), generated = time(snapshot.generated_at), reviewed = time(snapshot.scope.reviewed_at);
  if (![observed, generated, reviewed].every(Number.isFinite) || observed > generated || reviewed > generated || generated > now || !text(snapshot.scope.source)) return 'invalid_timestamp_or_source';
  return null;
}

/** Pure read policy: no persistence, provider calls, clock defaults or implicit TTL. */
export function standingsSnapshotView({scope, selection, candidate = null, previous = null, resultsTtlMs, reviewTtlMs, now, refreshFailed = false}) {
  if (!scope || !scopeFields.every(key => text(scope[key])) || !validSelection(selection)) throw new Error('INVALID_STANDINGS_VIEW_SCOPE');
  // Validate both independent policies even with no usable data.
  for (const ttlMs of [resultsTtlMs, reviewTtlMs]) dataState({data: null, fetchedAt: null, ttlMs, now});
  if (!Number.isFinite(now)) throw new Error('INVALID_FRESHNESS_POLICY');
  const reasons = [];
  const candidateError = rejection(candidate, scope, selection, now);
  const previousError = rejection(previous, scope, selection, now);
  if (candidateError) reasons.push({input: 'candidate', code: candidateError});
  if (previousError) reasons.push({input: 'previous', code: previousError});
  let selected = previous && !previousError ? previous : null;
  let selectedFrom = selected ? 'previous' : null;
  if (candidate && !candidateError) {
    if (!selected || time(candidate.data_as_of) > time(selected.data_as_of) || (time(candidate.data_as_of) === time(selected.data_as_of) && time(candidate.generated_at) >= time(selected.generated_at))) {
      selected = candidate;
      selectedFrom = 'candidate';
    } else reasons.push({input: 'candidate', code: 'older_observation'});
  }
  const failed = refreshFailed || Boolean(candidateError && (candidateError !== 'not_started' || selected)) || (!selected && Boolean(previousError && previousError !== 'not_started'));
  const results = dataState({data: selected, fetchedAt: selected?.data_as_of, ttlMs: resultsTtlMs, now, refreshFailed: failed});
  const review = dataState({data: selected, fetchedAt: selected?.scope.reviewed_at, ttlMs: reviewTtlMs, now});
  const stale = selected && (results.status === 'stale' || review.status === 'stale');
  const warnings = selected ? ['own_calculation', 'unverified_adjustments'] : [];
  if (results.status === 'stale') warnings.push('stale_results');
  if (review.status === 'stale') warnings.push('stale_review');
  if (selected?.rows.some(row => row.tie_status === 'pending')) warnings.push('unresolved_ties');
  if (failed) warnings.push('refresh_failed');
  return {
    status: stale ? 'stale' : results.status,
    label: !selected ? 'Sin datos' : stale ? 'Tabla provisional desactualizada' : 'Tabla provisional — cálculo propio',
    snapshot: selected ? structuredClone(selected) : null,
    selected_from: selectedFrom,
    results_as_of: selected?.data_as_of ?? null,
    review_as_of: selected?.scope.reviewed_at ?? null,
    results_status: results.status,
    review_status: review.status,
    official_status: 'unverified',
    warnings, reasons,
  };
}
