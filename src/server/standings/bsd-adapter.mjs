import 'server-only';
import {calculateStandings} from './calculate.mjs';

export function prepareBsdReview(mapping, review) {
  const schedule = mapping.rows.map(row => ({id: String(row.bsd_event_id), tournament: row.tournament, round: row.round, home_id: String(row.home_team_id), away_id: String(row.away_team_id)}));
  if (mapping.provider !== review.scope.provider || String(mapping.season_id) !== review.scope.season_id || schedule.length !== review.expectations.total || new Set(schedule.map(r => r.id)).size !== schedule.length) throw new Error('BSD_INVALID_STANDINGS_REVIEW');
  const replacementIds = new Set();
  for (const replacement of review.replacements) {
    const match = schedule.find(row => row.id === replacement.old_id);
    if (!match || replacementIds.has(replacement.old_id) || schedule.some(row => row.id === replacement.new_id) || !['tournament', 'round', 'home_id', 'away_id'].every(key => match[key] === replacement[key])) throw new Error('BSD_INVALID_STANDINGS_REPLACEMENT');
    replacementIds.add(replacement.old_id);
    match.id = replacement.new_id;
  }
  if (new Set(review.exclusions.map(row => row.id)).size !== review.exclusions.length || review.exclusions.some(row => schedule.some(match => match.id === row.id))) throw new Error('BSD_INVALID_STANDINGS_REVIEW');
  if (Object.keys(review.expectations.tournaments).length !== new Set(schedule.map(row => row.tournament)).size) throw new Error('BSD_INVALID_STANDINGS_REVIEW');
  for (const [tournament, expected] of Object.entries(review.expectations.tournaments)) {
    const matches = schedule.filter(row => row.tournament === tournament);
    const rounds = new Set(matches.map(row => row.round));
    if (matches.length !== expected.fixtures || rounds.size !== expected.rounds || [...rounds].some(round => matches.filter(row => row.round === round).length !== expected.per_round) || review.teams.some(team => !team.groups[tournament] || matches.filter(row => row.home_id === team.id || row.away_id === team.id).length !== expected.per_team)) throw new Error('BSD_INVALID_STANDINGS_REVIEW');
    for (const round of rounds) {
      const ids = matches.filter(row => row.round === round).flatMap(row => [row.home_id, row.away_id]);
      if (new Set(ids).size !== ids.length) throw new Error('BSD_INVALID_STANDINGS_REVIEW');
    }
  }
  return {...review, schedule};
}

/** Reviewed configuration is independent of provider group labels and dates. */
export function adaptBsdCatalog(catalog, review) {
  if (review.scope.provider !== 'bsd' || String(catalog.league_id) !== review.scope.competition_id || String(catalog.season_id) !== review.scope.season_id || catalog.count !== catalog.rows.length) throw new Error('BSD_STANDINGS_SCOPE_MISMATCH');
  const mapped = new Map(review.schedule.map(row => [row.id, row]));
  const excluded = new Map(review.exclusions.map(row => [row.id, row]));
  const replaced = new Map(review.replacements.map(row => [row.old_id, row]));
  const seen = new Set(), issues = [], fixtures = [];
  const times = new Map(catalog.observations.map(row => [row.id, row.fetched_at]));
  for (const row of catalog.rows) {
    const key = String(row.id);
    if (seen.has(key)) throw new Error('BSD_DUPLICATE_CATALOG_ID');
    seen.add(key);
    if (String(row.league_id) !== review.scope.competition_id || String(row.season_id) !== review.scope.season_id) throw new Error('BSD_STANDINGS_SCOPE_MISMATCH');
    const match = mapped.get(key), exclusion = excluded.get(key);
    if (!match) {
      const replacement = replaced.get(key);
      if (replacement) {
        if (row.status !== replacement.old_status || row.home_score !== null || row.away_score !== null || row.stage !== review.zone_stage || String(row.home_team_id) !== replacement.home_id || String(row.away_team_id) !== replacement.away_id || row.round_number !== replacement.round || row.replaced_by !== null) issues.push({fixture_id: key, code: 'changed_replaced_fixture'});
      } else if (!exclusion || row.stage !== exclusion.stage || row.replaced_by !== null) issues.push({fixture_id: key, code: 'unreviewed_catalog_entry'});
      continue;
    }
    const homeGroup = review.teams.find(team => team.id === match.home_id)?.groups[match.tournament];
    const awayGroup = review.teams.find(team => team.id === match.away_id)?.groups[match.tournament];
    const expectedStage = homeGroup === awayGroup ? review.zone_stage : review.interzone_stage;
    if (row.stage !== expectedStage || row.replaced_by !== null) issues.push({fixture_id: key, code: 'changed_stage_or_replacement'});
    fixtures.push({id: key, provider: 'bsd', competition_id: String(row.league_id), season_id: String(row.season_id), home_id: String(row.home_team_id), away_id: String(row.away_team_id), round: row.round_number,
      state: row.status === 'finished' ? 'finished' : row.status === 'notstarted' ? 'not_started' : 'unknown',
      source_status: row.status, home_score: row.home_score, away_score: row.away_score, fetched_at: times.get(row.id)});
  }
  return {scope: review.scope, schedule: review.schedule, teams: review.teams, fixtures, issues,
    excluded: catalog.rows.filter(row => !mapped.has(String(row.id))).map(row => ({id: row.id, stage: row.stage, status: row.status, replaced_by: row.replaced_by}))};
}

export function runBsdStandings(catalog, mapping, review, generatedAt) {
  const prepared = prepareBsdReview(mapping, review);
  const adapted = adaptBsdCatalog(catalog, prepared);
  const selections = [{kind: 'annual'}];
  for (const tournament of Object.keys(review.expectations.tournaments)) {
    selections.push({kind: 'tournament', tournament});
    for (const group of new Set(review.teams.map(team => team.groups[tournament]))) selections.push({kind: 'tournament', tournament, group});
  }
  const snapshots = selections.map(selection => {
    const result = calculateStandings({...adapted, selection, generatedAt});
    if (adapted.issues.length) return {...result, state: 'incomplete', rows: [], issues: [...result.issues, ...adapted.issues]};
    return result;
  });
  return {generated_at: generatedAt, mode: 'dry-run', catalog_count: catalog.count, pages: catalog.pages, audit_issues: adapted.issues, excluded: adapted.excluded, snapshots};
}

/** Historical comparison only: this never stamps current official positions. */
export function compareReviewedTables(report, evidence) {
  const fields = ['pts', 'played', 'won', 'drawn', 'lost', 'gf', 'ga', 'gd'];
  return evidence.tables.map(table => {
    const [tournament, group] = table.key.split(':');
    const snapshot = report.snapshots.find(s => tournament === 'annual' ? s.selection.kind === 'annual' : s.selection.tournament === tournament && s.selection.group === group);
    const differences = [];
    if (snapshot?.state !== 'complete') return {key: table.key, compared: 0, state: 'unavailable', differences: []};
    const publishedIds = new Set(table.rows.map(row => row.team_id));
    if (publishedIds.size !== table.rows.length || snapshot.rows.length !== table.rows.length || snapshot.rows.some(row => !publishedIds.has(row.team_id))) throw new Error('BSD_INVALID_OFFICIAL_COMPARISON');
    for (const published of table.rows) {
      const calculated = snapshot.rows.find(row => row.team_id === published.team_id);
      for (const field of [...fields, 'calculated_position']) {
        const expected = field === 'calculated_position' ? published.position : published[field];
        if (calculated[field] !== expected) differences.push({team_id: published.team_id, field, calculated: calculated[field], published: expected});
      }
    }
    return {key: table.key, compared: table.rows.length, state: differences.length ? 'differences' : 'match', differences};
  });
}
