import 'server-only';

const validId = value => typeof value === 'string' && value.trim().length > 0;
const validTime = value => typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const validScore = value => Number.isSafeInteger(value) && value >= 0;
const compare = (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;

/** Only the verified first three criteria; a residual tie has no assigned position. */
export function rankAccumulated(rows) {
  const ids = new Set();
  for (const row of rows) {
    if (!validId(row.team_id) || ids.has(row.team_id) || !['pts', 'gf', 'ga'].every(key => validScore(row[key])) || row.gd !== row.gf - row.ga) throw new Error('INVALID_STANDINGS_TOTALS');
    ids.add(row.team_id);
  }
  const sorted = rows.map(row => ({...row})).sort(compare);
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && compare(sorted[start], sorted[end]) === 0) end++;
    for (let index = start; index < end; index++) {
      sorted[index].calculated_position = end - start === 1 ? start + 1 : null;
      sorted[index].position_range = [start + 1, end];
      sorted[index].tie_status = end - start === 1 ? 'resolved_basic' : 'pending';
    }
    start = end;
  }
  return sorted;
}

/**
 * Pure calculation, no upstream calls or database writes. The caller supplies a
 * reviewed complete zone-phase schedule, not just the tracked team's fixtures.
 * Match state is normalized by the caller: finished or not_started only; all
 * other states require review. Missing evidence prevents publication of totals.
 */
export function calculateStandings({scope, schedule, teams, fixtures, selection, generatedAt}) {
  if (!scope || !['provider', 'competition_id', 'season_id', 'source'].every(key => validId(scope[key])) || !validTime(scope.reviewed_at) || !validTime(generatedAt) || Date.parse(scope.reviewed_at) > Date.parse(generatedAt)) throw new Error('INVALID_STANDINGS_SCOPE');
  if (!Array.isArray(schedule) || !schedule.length || !Array.isArray(teams) || !teams.length || !Array.isArray(fixtures)) throw new Error('INVALID_STANDINGS_INPUT');
  if (!selection || !['annual', 'tournament'].includes(selection.kind) || (selection.kind === 'tournament' && !validId(selection.tournament)) || (selection.kind === 'annual' && (selection.tournament !== undefined || selection.group !== undefined)) || (selection.group !== undefined && !validId(selection.group))) throw new Error('INVALID_STANDINGS_SELECTION');
  const teamMap = new Map();
  for (const team of teams) {
    if (!validId(team.id) || teamMap.has(team.id) || !team.groups || typeof team.groups !== 'object') throw new Error('INVALID_STANDINGS_TEAMS');
    teamMap.set(team.id, team);
  }
  const mapped = new Map();
  for (const match of schedule) {
    if (!validId(match.id) || mapped.has(match.id) || !validId(match.tournament) || match.home_id === match.away_id || !Number.isSafeInteger(match.round) || match.round < 1 || ![match.home_id, match.away_id].every(id => teamMap.has(id) && validId(teamMap.get(id).groups[match.tournament]))) throw new Error('INVALID_STANDINGS_SCHEDULE');
    mapped.set(match.id, match);
  }
  const selected = schedule.filter(match => selection.kind === 'annual' || match.tournament === selection.tournament);
  if (!selected.length) throw new Error('INVALID_STANDINGS_SELECTION');
  const includedTeams = teams.filter(team => selection.kind === 'annual' || (validId(team.groups[selection.tournament]) && (selection.group === undefined || team.groups[selection.tournament] === selection.group)));
  if (!includedTeams.length) throw new Error('INVALID_STANDINGS_SELECTION');
  const wanted = selected.filter(match => includedTeams.some(team => team.id === match.home_id || team.id === match.away_id));
  if (includedTeams.some(team => !wanted.some(match => match.home_id === team.id || match.away_id === team.id))) throw new Error('INVALID_STANDINGS_SCHEDULE');
  const wantedIds = new Set(wanted.map(match => match.id));
  const input = new Map();
  let excluded = 0;
  for (const fixture of fixtures) {
    if (fixture.provider !== scope.provider || fixture.competition_id !== scope.competition_id || fixture.season_id !== scope.season_id || !wantedIds.has(fixture.id)) { excluded++; continue; }
    if (input.has(fixture.id)) throw new Error('DUPLICATE_STANDINGS_FIXTURE');
    input.set(fixture.id, fixture);
  }
  const totals = new Map(teams.map(team => [team.id, {team_id: team.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0}]));
  const issues = [];
  let finished = 0;
  let dataAsOf = null;
  for (const match of wanted) {
    const fixture = input.get(match.id);
    const issue = code => issues.push({fixture_id: match.id, code});
    if (!fixture) { issue('missing_fixture'); continue; }
    if (fixture.home_id !== match.home_id || fixture.away_id !== match.away_id || fixture.round !== match.round) { issue('mapping_mismatch'); continue; }
    if (!validTime(fixture.fetched_at) || Date.parse(fixture.fetched_at) > Date.parse(generatedAt)) { issue('invalid_timestamp'); continue; }
    if (dataAsOf === null || Date.parse(fixture.fetched_at) < Date.parse(dataAsOf)) dataAsOf = fixture.fetched_at;
    if (fixture.state === 'not_started') continue;
    if (fixture.state !== 'finished') { issue('unresolved_match_state'); continue; }
    if (![fixture.home_score, fixture.away_score].every(validScore)) { issue('missing_or_invalid_score'); continue; }
    finished++;
    for (const [id, gf, ga] of [[match.home_id, fixture.home_score, fixture.away_score], [match.away_id, fixture.away_score, fixture.home_score]]) {
      const row = totals.get(id);
      row.played++; row.gf += gf; row.ga += ga; row.gd = row.gf - row.ga;
      if (gf > ga) { row.won++; row.pts += 3; }
      else if (gf === ga) { row.drawn++; row.pts++; }
      else row.lost++;
    }
  }
  const state = issues.length ? 'incomplete' : finished ? 'complete' : 'not_started';
  const rows = state === 'complete' ? rankAccumulated(includedTeams.map(team => totals.get(team.id))) : [];
  return {
    scope: {...scope}, selection: {...selection}, generated_at: generatedAt, data_as_of: dataAsOf,
    state, origin: 'own_calculation', adjustments_status: 'unverified',
    criteria: ['points', 'goal_difference', 'goals_for'],
    coverage: {expected: wanted.length, received: input.size, finished, excluded}, issues,
    rows: rows.map(row => ({...row, official_position: null})),
  };
}
