import 'server-only';
import {createHash} from 'node:crypto';
import {canonicalJson, validateStandingsBatch} from './batch.mjs';
import {standingsSnapshotView} from './snapshot-view.mjs';

const fields = ['pts', 'played', 'won', 'drawn', 'lost', 'gf', 'ga', 'gd'];
const validTime = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key = selection => canonicalJson(selection);

/** Evidence is an explicitly reviewed official transcription, never auto-inherited. */
export function createOfficialReview({id, batch, evidence, requestActivation = false, policy, now}) {
  const checked = validateStandingsBatch(batch);
  if (!uuid.test(id) || typeof requestActivation !== 'boolean' || !Number.isFinite(now) || !policy || !['resultsTtlMs', 'reviewTtlMs', 'evidenceTtlMs'].every(k => Number.isFinite(policy[k]) && policy[k] > 0)) throw new Error('INVALID_OFFICIAL_REVIEW_POLICY');
  if (!evidence || evidence.batch_id !== checked.id || evidence.payload_hash !== checked.payload_hash || !validTime(evidence.observed_at) || Date.parse(evidence.observed_at) > now || Date.parse(checked.generated_at) > now || !Array.isArray(evidence.tables)) throw new Error('INVALID_OFFICIAL_REVIEW_BINDING');
  const expected = checked.payload.snapshots.filter(s => s.selection.kind === 'annual' || s.selection.group !== undefined);
  const supplied = new Map();
  const tables = evidence.tables.map(table => {
    const selection = table.selection;
    const selectionKey = key(selection);
    if (!expected.some(s => key(s.selection) === selectionKey) || supplied.has(selectionKey) || !Array.isArray(table.rows)) throw new Error('INVALID_OFFICIAL_REVIEW_COVERAGE');
    let source;
    try { source = new URL(table.source); } catch { throw new Error('INVALID_OFFICIAL_REVIEW_SOURCE'); }
    if (source.protocol !== 'https:' || source.username || source.password) throw new Error('INVALID_OFFICIAL_REVIEW_SOURCE');
    const seen = new Set();
    const rows = table.rows.map(row => {
      if (typeof row.team_id !== 'string' || !row.team_id || seen.has(row.team_id) || !Number.isSafeInteger(row.position) || row.position < 1 || !fields.every(f => Number.isSafeInteger(row[f]) && (f === 'gd' || row[f] >= 0)) || row.gd !== row.gf - row.ga || row.played !== row.won + row.drawn + row.lost) throw new Error('INVALID_OFFICIAL_REVIEW_ROW');
      seen.add(row.team_id);
      return {team_id: row.team_id, position: row.position, ...Object.fromEntries(fields.map(f => [f, row[f]]))};
    });
    const expectedTeams = checked.payload.input.teams.filter(team => selection.kind === 'annual' || team.groups[selection.tournament] === selection.group);
    if (seen.size !== expectedTeams.length || expectedTeams.some(team => !seen.has(team.id))) throw new Error('INVALID_OFFICIAL_REVIEW_COVERAGE');
    const result = {selection: {...selection}, source: source.href, rows};
    supplied.set(selectionKey, result);
    return result;
  });
  if (supplied.size !== expected.length) throw new Error('INVALID_OFFICIAL_REVIEW_COVERAGE');
  const differences = [];
  for (const snapshot of expected) {
    if (snapshot.state !== 'complete') continue;
    for (const published of supplied.get(key(snapshot.selection)).rows) {
      const calculated = snapshot.rows.find(r => r.team_id === published.team_id);
      for (const field of [...fields, 'calculated_position']) {
        const official = field === 'calculated_position' ? published.position : published[field];
        if (calculated[field] !== official) differences.push({selection: snapshot.selection, team_id: published.team_id, field, calculated: calculated[field], published: official});
      }
    }
  }
  const status = checked.status !== 'complete' ? 'unavailable' : differences.length ? 'differences' : 'match';
  const reasons = [];
  if (status !== 'match') reasons.push('official_' + status);
  const latestObservation = Math.max(...checked.payload.input.fixtures.map(f => Date.parse(f.fetched_at)));
  if (!Number.isFinite(latestObservation) || Date.parse(evidence.observed_at) < latestObservation) reasons.push('evidence_predates_catalog');
  if (now - Date.parse(evidence.observed_at) >= policy.evidenceTtlMs) reasons.push('stale_evidence');
  for (const snapshot of checked.payload.snapshots) {
    const view = standingsSnapshotView({scope: snapshot.scope, selection: snapshot.selection, candidate: snapshot, now,
      resultsTtlMs: policy.resultsTtlMs, reviewTtlMs: policy.reviewTtlMs});
    if (view.status !== 'fresh') reasons.push('snapshot_not_fresh');
  }
  const payload = {evidence: {batch_id: checked.id, payload_hash: checked.payload_hash, observed_at: evidence.observed_at, tables},
    differences, activation_requested: requestActivation,
    policy: {resultsTtlMs: policy.resultsTtlMs, reviewTtlMs: policy.reviewTtlMs, evidenceTtlMs: policy.evidenceTtlMs}, reasons: [...new Set(reasons)]};
  return {id: id.toLowerCase(), batch_id: checked.id, batch_payload_hash: checked.payload_hash,
    reviewed_at: new Date(now).toISOString(), observed_at: evidence.observed_at, status,
    activated: requestActivation && reasons.length === 0, payload,
    review_hash: createHash('sha256').update(canonicalJson(payload)).digest('hex')};
}
