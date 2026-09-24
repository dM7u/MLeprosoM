import 'server-only';
import {createHash} from 'node:crypto';
import {calculateStandings} from './calculate.mjs';

export const canonicalJson = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
};
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Persist normalized inputs only. No provider bodies, names, headers or credentials. */
export function createStandingsBatch({id, input, generatedAt, auditIssues = [], excludedIds = [], requestCount = 0}) {
  if (!uuid.test(id) || !Number.isSafeInteger(requestCount) || requestCount < 0 || !Array.isArray(auditIssues) || !Array.isArray(excludedIds)) throw new Error('INVALID_STANDINGS_BATCH');
  const normalized = {
    scope: pick(input.scope, ['provider', 'competition_id', 'season_id', 'source', 'reviewed_at']),
    schedule: input.schedule.map(row => pick(row, ['id', 'tournament', 'round', 'home_id', 'away_id'])),
    teams: input.teams.map(row => ({id: row.id, groups: {...row.groups}})),
    fixtures: input.fixtures.map(row => pick(row, ['id', 'provider', 'competition_id', 'season_id', 'home_id', 'away_id', 'round', 'state', 'home_score', 'away_score', 'fetched_at'])),
  };
  if (auditIssues.some(row => typeof row.fixture_id !== 'string' || !row.fixture_id || !/^[a-z_]+$/.test(row.code)) || excludedIds.some(id => typeof id !== 'string' || !id) || new Set(excludedIds).size !== excludedIds.length) throw new Error('INVALID_STANDINGS_BATCH_AUDIT');
  // Reject values JSON would silently omit/coerce before computing a durable hash.
  JSON.stringify(normalized, (_key, value) => {
    if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('INVALID_STANDINGS_BATCH_INPUT');
    return value;
  });
  const inputText = canonicalJson(normalized);
  let roundtrip;
  try { roundtrip = JSON.parse(inputText); } catch { throw new Error('INVALID_STANDINGS_BATCH_INPUT'); }
  if (canonicalJson(roundtrip) !== inputText) throw new Error('INVALID_STANDINGS_BATCH_INPUT');
  const selections = [{kind: 'annual'}];
  for (const tournament of new Set(normalized.schedule.map(row => row.tournament))) {
    selections.push({kind: 'tournament', tournament});
    for (const group of new Set(normalized.teams.map(row => row.groups[tournament]).filter(Boolean))) selections.push({kind: 'tournament', tournament, group});
  }
  const issues = auditIssues.map(row => pick(row, ['fixture_id', 'code']));
  const snapshots = selections.map(selection => {
    const result = calculateStandings({...normalized, selection, generatedAt});
    return issues.length ? {...result, state: 'incomplete', rows: [], issues: [...result.issues, ...issues]} : result;
  });
  const status = snapshots.every(row => row.state === 'complete') ? 'complete' : 'incomplete';
  const payload = {input: normalized, audit_issues: issues, excluded_ids: [...excludedIds], request_count: requestCount, snapshots};
  return {
    id: id.toLowerCase(), provider: normalized.scope.provider,
    competition_external_id: normalized.scope.competition_id, season_external_id: normalized.scope.season_id,
    contract_version: 1, engine_version: 'standings-basic-v1',
    input_hash: hash(normalized.fixtures), review_hash: hash({scope: normalized.scope, schedule: normalized.schedule, teams: normalized.teams, excluded_ids: excludedIds}),
    payload_hash: hash(payload), generated_at: generatedAt,
    data_as_of: snapshots[0].data_as_of, status, payload,
  };
}

/** Recompute all rows/hashes before any write; reject extra envelope/payload fields. */
export function validateStandingsBatch(batch) {
  try {
    const expected = createStandingsBatch({id: batch.id, input: batch.payload.input, generatedAt: batch.generated_at,
      auditIssues: batch.payload.audit_issues, excludedIds: batch.payload.excluded_ids, requestCount: batch.payload.request_count});
    if (canonicalJson(expected) !== canonicalJson(batch)) throw new Error('INVALID_STANDINGS_BATCH');
    return expected;
  } catch { throw new Error('INVALID_STANDINGS_BATCH'); }
}
