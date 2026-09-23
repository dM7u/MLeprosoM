import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateStandings, rankAccumulated} from '../src/server/standings/calculate.mjs';

// Synthetic cases test rules only; never used as application data.
function sample() {
  const scope = {provider: 'test', competition_id: 'league', season_id: 'season', source: 'test fixture', reviewed_at: '2026-01-01T00:00:00Z'};
  const schedule = [
    {id: 'one', tournament: 'Opening', round: 1, home_id: 'a', away_id: 'b'},
    {id: 'two', tournament: 'Closing', round: 1, home_id: 'b', away_id: 'a'},
  ];
  const fixtures = schedule.map(match => ({...match, provider: scope.provider, competition_id: scope.competition_id, season_id: scope.season_id, state: 'finished', home_score: 0, away_score: 0, fetched_at: '2026-09-01T00:00:00Z'}));
  fixtures[0].home_score = 2;
  return {scope, schedule, fixtures, teams: [{id: 'a', groups: {Opening: 'X', Closing: 'X'}}, {id: 'b', groups: {Opening: 'Y', Closing: 'Y'}}], selection: {kind: 'annual'}, generatedAt: '2026-09-24T00:00:00Z'};
}

test('annual counts both zone stages and excludes unmapped knockout and foreign scope', () => {
  const input = sample();
  input.fixtures.push({...input.fixtures[0], id: 'knockout', home_score: 9}, {...input.fixtures[0], provider: 'other'});
  const result = calculateStandings(input);
  assert.equal(result.state, 'complete');
  assert.deepEqual(result.coverage, {expected: 2, received: 2, finished: 2, excluded: 2});
  assert.deepEqual(result.rows.map(row => [row.team_id, row.played, row.won, row.drawn, row.lost, row.gf, row.ga, row.gd, row.pts]), [['a', 2, 1, 1, 0, 2, 0, 2, 4], ['b', 2, 0, 1, 1, 0, 2, -2, 1]]);
  assert.equal(result.adjustments_status, 'unverified');
  assert.equal(result.rows[0].official_position, null);
  assert.equal(result.data_as_of, input.fixtures[0].fetched_at);
});

test('zone counts interzone opponent; does not mix tournament or require fixed team count', () => {
  const input = sample();
  input.selection = {kind: 'tournament', tournament: 'Opening', group: 'X'};
  const result = calculateStandings(input);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].pts, 3);
  assert.equal(result.rows[0].played, 1);
  assert.equal(result.coverage.excluded, 1);
});

test('missing, null, invalid and unknown data suppress all table rows', () => {
  for (const [patch, code] of [
    [{home_score: null}, 'missing_or_invalid_score'],
    [{away_score: -1}, 'missing_or_invalid_score'],
    [{away_score: 1.5}, 'missing_or_invalid_score'],
    [{state: 'unknown'}, 'unresolved_match_state'],
    [{state: 'live'}, 'unresolved_match_state'],
    [{home_id: 'b'}, 'mapping_mismatch'],
    [{round: 2}, 'mapping_mismatch'],
    [{fetched_at: null}, 'invalid_timestamp'],
    [{fetched_at: '2030-01-01T00:00:00Z'}, 'invalid_timestamp'],
  ]) {
    const input = sample(); Object.assign(input.fixtures[0], patch);
    const result = calculateStandings(input);
    assert.equal(result.state, 'incomplete');
    assert.deepEqual(result.rows, []);
    assert.equal(result.issues[0].code, code);
  }
  const input = sample(); input.fixtures.pop();
  assert.equal(calculateStandings(input).issues[0].code, 'missing_fixture');
});

test('wrong season cannot fill missing coverage; duplicate results cannot double points', () => {
  const input = sample(); input.fixtures[0].season_id = 'another';
  assert.equal(calculateStandings(input).state, 'incomplete');
  const duplicate = sample(); duplicate.fixtures.push({...duplicate.fixtures[0]});
  assert.throws(() => calculateStandings(duplicate), /DUPLICATE_STANDINGS_FIXTURE/);
});

test('scheduled scores are never counted; all scheduled is not a zero-position table', () => {
  const input = sample(); input.fixtures[1].state = 'not_started';
  assert.equal(calculateStandings(input).rows[0].played, 1);
  input.fixtures[0].state = 'not_started';
  assert.equal(calculateStandings(input).state, 'not_started');
  assert.deepEqual(calculateStandings(input).rows, []);
});

test('zero-zero is a real draw and unresolved tie does not use ID or input order', () => {
  const input = sample(); input.fixtures[0].home_score = 0;
  for (const teams of [input.teams, [...input.teams].reverse()]) {
    const result = calculateStandings({...input, teams});
    for (const row of result.rows) {
      assert.equal(row.pts, 2);
      assert.equal(row.gf, 0);
      assert.equal(row.calculated_position, null);
      assert.deepEqual(row.position_range, [1, 2]);
      assert.equal(row.tie_status, 'pending');
    }
  }
});

test('invalid configuration fails before calculating plausible totals', () => {
  for (const change of [
    input => input.schedule.push({...input.schedule[0]}),
    input => input.teams.push({...input.teams[0]}),
    input => input.schedule[0].home_id = 'missing',
    input => input.schedule[0].away_id = 'a',
    input => input.selection = {kind: 'tournament', tournament: 'missing'},
    input => input.selection = {kind: 'annual', group: 'X'},
    input => input.scope.source = '',
    input => input.teams.push({id: 'uncovered', groups: {Opening: 'X'}}),
  ]) { const input = sample(); change(input); assert.throws(() => calculateStandings(input), /INVALID_STANDINGS/); }
});

test('oldest observation is preserved and calculation does not mutate inputs', () => {
  const input = sample(); input.fixtures[1].fetched_at = '2026-08-01T00:00:00Z';
  const before = structuredClone(input);
  assert.equal(calculateStandings(input).data_as_of, '2026-08-01T00:00:00Z');
  assert.deepEqual(input, before);
});

test('ranking reproduces all 60 historical verified zone positions, not current standings', () => {
  const evidence = JSON.parse(readFileSync(new URL('../docs/research/lpf-zones-validation-20260918.json', import.meta.url)));
  for (const zone of evidence.zones) {
    const rows = rankAccumulated(zone.rows.map(row => ({team_id: String(row.bsd_team_id), ...row.calculated})));
    assert.deepEqual(rows.map(row => [row.team_id, row.calculated_position]), zone.rows.map(row => [String(row.bsd_team_id), row.position]));
  }
});
