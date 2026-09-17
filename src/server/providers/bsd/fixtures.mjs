import 'server-only';
export { requestBsd as bsdGet } from './request.mjs';

function requiredId(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('BSD_INVALID_ID');
  return String(value);
}
function name(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('BSD_INVALID_NAME');
  return value.trim();
}
function score(value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('BSD_INVALID_SCORE');
  return value;
}

export function normalizeFixtures(body, seasonId, teamId, fetchedAt) {
  if (!body || !Array.isArray(body.results) || body.next !== null || body.count !== body.results.length) {
    throw new Error('BSD_INCOMPLETE_PAGE');
  }
  const seen = new Set();
  return body.results.map(row => {
    const external_id = requiredId(row.id);
    if (seen.has(external_id)) throw new Error('BSD_DUPLICATE_FIXTURE');
    seen.add(external_id);
    if (row.season_id !== seasonId || ![row.home_team_id, row.away_team_id].includes(teamId)) throw new Error('BSD_SCOPE_MISMATCH');
    const home = { external_id: requiredId(row.home_team_id), name: name(row.home_team) };
    const away = { external_id: requiredId(row.away_team_id), name: name(row.away_team) };
    if (home.external_id === away.external_id) throw new Error('BSD_INVALID_TEAMS');
    if (row.event_date !== null && (typeof row.event_date !== 'string' || !Number.isFinite(Date.parse(row.event_date)))) throw new Error('BSD_INVALID_DATE');
    for (const field of ['stage', 'group_name']) if (row[field] !== null && typeof row[field] !== 'string') throw new Error('BSD_INVALID_LABEL');
    if (row.round_number !== null && !Number.isSafeInteger(row.round_number)) throw new Error('BSD_INVALID_ROUND');
    return { home, away, fixture: {
      provider: 'bsd', external_id, kickoff_at: row.event_date,
      source_status: name(row.status), source_stage: row.stage, source_group: row.group_name,
      source_round: row.round_number, home_score: score(row.home_score), away_score: score(row.away_score),
      fetched_at: fetchedAt, source_updated_at: null,
    } };
  });
}
