import 'server-only';
import {requestBsd} from './request.mjs';

const base = 'https://sports.bzzoiro.com/api/v2/';
const id = value => Number.isSafeInteger(value) && value > 0;

/** Full league/season listing. Never follow an upstream URL with credentials. */
export async function readBsdCatalog({leagueId, seasonId, apiKey, fetcher = fetch, maxPages = 10, pageSize = 100, onAttempt}) {
  if (![leagueId, seasonId].every(id) || !id(maxPages) || maxPages > 10 || !id(pageSize) || pageSize > 100) throw new Error('BSD_INVALID_CATALOG_SCOPE');
  const rows = [], seen = new Set(), observations = [];
  let total = null;
  for (let page = 0; page < maxPages; page++) {
    const offset = rows.length;
    const fetchedAt = new Date().toISOString();
    const body = await requestBsd(`events/?league_id=${leagueId}&season_id=${seasonId}&limit=${pageSize}&offset=${offset}`, apiKey, fetcher, {onAttempt});
    if (!Number.isSafeInteger(body?.count) || body.count < 0 || !Array.isArray(body.results) || body.results.length > pageSize || (total !== null && total !== body.count)) throw new Error('BSD_INVALID_CATALOG_PAGE');
    total = body.count;
    if (total > maxPages * pageSize) throw new Error('BSD_CATALOG_BUDGET_EXCEEDED');
    for (const row of body.results) {
      if (!id(row.id) || seen.has(row.id)) throw new Error('BSD_DUPLICATE_CATALOG_ID');
      if (row.league_id !== leagueId || row.season_id !== seasonId) throw new Error('BSD_CATALOG_SCOPE_MISMATCH');
      seen.add(row.id);
      // Keep only fields required for audit/calculation, not full match detail.
      rows.push(Object.fromEntries(['id', 'league_id', 'season_id', 'home_team_id', 'away_team_id', 'home_team', 'away_team', 'round_number', 'stage', 'group_name', 'status', 'home_score', 'away_score', 'event_date', 'replaced_by'].map(key => [key, row[key]])));
      observations.push({id: row.id, fetched_at: fetchedAt});
    }
    if (rows.length > total || (!body.results.length && rows.length !== total)) throw new Error('BSD_INCOMPLETE_CATALOG');
    if (rows.length === total) {
      if (body.next !== null) throw new Error('BSD_INVALID_CATALOG_NEXT');
      return {league_id: leagueId, season_id: seasonId, count: total, pages: page + 1, rows, observations};
    }
    let next;
    try { next = new URL(body.next, base); } catch { throw new Error('BSD_INVALID_CATALOG_NEXT'); }
    const expected = {league_id: String(leagueId), season_id: String(seasonId), limit: String(pageSize), offset: String(rows.length)};
    if (typeof body.next !== 'string' || next.origin !== new URL(base).origin || next.pathname !== '/api/v2/events/' || next.username || next.password || next.hash || [...next.searchParams].length !== 4 || Object.entries(expected).some(([key, value]) => next.searchParams.get(key) !== value)) throw new Error('BSD_INVALID_CATALOG_NEXT');
  }
  throw new Error('BSD_CATALOG_BUDGET_EXCEEDED');
}
