import 'server-only';

const text = value => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('GOAL_INVALID_FIELD');
  return value;
};
const timestamp = value => {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('GOAL_INVALID_DATE');
  return value;
};
const score = value => {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('GOAL_INVALID_SCORE');
  return Number(value);
};
const optionalText = value => value === null ? null : text(value);

/** No retries and no redirects. Only the documented provider origin receives the key. */
export async function requestGoal(path, key, fetcher = fetch) {
  if (typeof key !== 'string' || !key.trim()) throw new Error('GOAL_KEY_MISSING');
  const url = new URL(path, 'https://api.goal-api.com/v1/');
  if (url.origin !== 'https://api.goal-api.com' || !url.pathname.startsWith('/v1/') || url.username || url.password || url.hash) throw new Error('GOAL_INVALID_URL');
  let response;
  try {
    response = await fetcher(url, {headers: {Authorization: `Bearer ${key}`}, redirect: 'error', signal: AbortSignal.timeout(20000)});
  } catch { throw new Error('GOAL_CONNECTION_FAILED'); }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`GOAL_HTTP_${response.status}`);
  }
  let body;
  try { body = await response.json(); } catch { throw new Error('GOAL_INVALID_JSON'); }
  if (body?.success !== true) throw new Error('GOAL_RESPONSE_FAILED');
  return body;
}

export function normalizeGoalFixture(row, {teamId, leagueId, season}, fetchedAt) {
  if (row.leagueId !== leagueId || row.leagueYear !== season || ![row.homeTeamId, row.awayTeamId].includes(teamId)) throw new Error('GOAL_SCOPE_MISMATCH');
  const home = {external_id: text(row.homeTeamId), name: text(row.homeTeamName)};
  const away = {external_id: text(row.awayTeamId), name: text(row.awayTeamName)};
  if (home.external_id === away.external_id) throw new Error('GOAL_INVALID_TEAMS');
  if (fetchedAt === null) throw new Error('GOAL_INVALID_DATE');
  return {home, away, fixture: {
    provider: 'goal-api', external_id: text(row.id), competition_external_id: text(row.leagueId), season: text(row.leagueYear),
    kickoff_at: timestamp(row.kickoffUtc), source_status: text(row.matchStatus),
    source_stage: optionalText(row.stageName), source_round: optionalText(row.matchRound),
    home_score: score(row.homeTeamScore), away_score: score(row.awayTeamScore),
    home_fulltime_score: score(row.homeTeamFtScore), away_fulltime_score: score(row.awayTeamFtScore),
    home_extra_score: score(row.homeTeamExtraScore), away_extra_score: score(row.awayTeamExtraScore),
    home_penalty_score: score(row.homeTeamPenaltyScore), away_penalty_score: score(row.awayTeamPenaltyScore),
    fetched_at: timestamp(fetchedAt), source_updated_at: timestamp(row.updatedAt),
  }};
}

/** Retrieve a complete bounded team catalogue, then select the explicit competition/season. */
export async function readGoalTeamFixtures(get, scope, fetchedAt, {maxPages = 10} = {}) {
  const {teamId, leagueId, season} = scope;
  for (const value of [teamId, leagueId, season]) text(value);
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 10) throw new Error('GOAL_INVALID_PAGE_BUDGET');
  let offset = 0, expectedTotal;
  const seen = new Set(), selected = [];
  for (let page = 0; page < maxPages; page++) {
    const body = await get(`teams/${encodeURIComponent(teamId)}/fixtures?limit=50&offset=${offset}`);
    const p = body?.pagination;
    if (body?.success !== true || !Array.isArray(body.data) || !p ||
        !Number.isSafeInteger(p.total) || p.total < 0 || !Number.isSafeInteger(p.limit) || p.limit < 1 || p.limit > 50 ||
        p.offset !== offset || typeof p.hasMore !== 'boolean' || body.data.length > p.limit ||
        offset + body.data.length > p.total || p.hasMore !== (offset + body.data.length < p.total) ||
        (p.hasMore && body.data.length !== p.limit)) throw new Error('GOAL_INCOMPLETE_PAGE');
    if (expectedTotal !== undefined && p.total !== expectedTotal) throw new Error('GOAL_CATALOG_CHANGED');
    expectedTotal = p.total;
    for (const row of body.data) {
      if (!row || typeof row !== 'object') throw new Error('GOAL_INVALID_FIELD');
      const id = text(row.id);
      if (seen.has(id)) throw new Error('GOAL_DUPLICATE_FIXTURE');
      seen.add(id);
      if (![row.homeTeamId, row.awayTeamId].includes(teamId)) throw new Error('GOAL_SCOPE_MISMATCH');
      text(row.leagueId); text(row.leagueYear);
      if (row.leagueId === leagueId && row.leagueYear === season) selected.push(normalizeGoalFixture(row, scope, fetchedAt));
    }
    offset += body.data.length;
    if (!p.hasMore) return {scanned: seen.size, excluded: seen.size - selected.length, pages: page + 1, fixtures: selected};
  }
  throw new Error('GOAL_PAGE_BUDGET_EXCEEDED');
}
