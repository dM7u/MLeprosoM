import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateStandings} from '../src/server/standings/calculate.mjs';
import {standingsSnapshotView} from '../src/server/standings/snapshot-view.mjs';

const now = Date.parse('2026-09-24T12:00:00Z');
function sample() {
  const scope = {provider: 'test', competition_id: 'league', season_id: '2026', source: 'synthetic review', reviewed_at: '2026-09-24T11:00:00Z'};
  const selection = {kind: 'annual'};
  const candidate = calculateStandings({scope, selection, generatedAt: '2026-09-24T11:59:00Z',
    teams: [{id: 'a', groups: {Opening: 'A'}}, {id: 'b', groups: {Opening: 'B'}}],
    schedule: [{id: '1', tournament: 'Opening', round: 1, home_id: 'a', away_id: 'b'}],
    fixtures: [{id: '1', provider: 'test', competition_id: 'league', season_id: '2026', home_id: 'a', away_id: 'b', round: 1, state: 'finished', home_score: 0, away_score: 0, fetched_at: '2026-09-24T11:58:00Z'}]});
  return {scope, selection, candidate, resultsTtlMs: 300000, reviewTtlMs: 7200000, now};
}

test('fresh complete calculation remains provisional with pending ties and no official positions', () => {
  const input = sample(), before = structuredClone(input);
  const view = standingsSnapshotView(input);
  assert.equal(view.status, 'fresh');
  assert.equal(view.official_status, 'unverified');
  assert.deepEqual(view.warnings, ['own_calculation', 'unverified_adjustments', 'unresolved_ties']);
  assert.ok(view.snapshot.rows.every(r => r.calculated_position === null && r.official_position === null));
  view.snapshot.rows[0].pts = 100;
  assert.deepEqual(input, before);
});

test('old observation stays stale after recalculation; review ages independently', () => {
  const input = sample(); input.candidate.data_as_of = '2026-09-24T10:00:00Z';
  assert.equal(standingsSnapshotView(input).results_status, 'stale');
  const oldReview = sample(); oldReview.candidate.scope.reviewed_at = '2026-09-23T11:00:00Z';
  const view = standingsSnapshotView(oldReview);
  assert.equal(view.results_status, 'fresh');
  assert.equal(view.review_status, 'stale');
  assert.equal(view.status, 'stale');
  assert.equal(standingsSnapshotView({...sample(), resultsTtlMs: 120000}).status, 'stale');
});

test('failed or incomplete refresh retains last good table with its original timestamps', () => {
  const input = sample(), previous = structuredClone(input.candidate);
  for (const candidate of [null, {...input.candidate, state: 'incomplete', rows: [], issues: [{code: 'missing_fixture'}]}]) {
    const view = standingsSnapshotView({...input, previous, candidate, refreshFailed: true});
    assert.equal(view.status, 'stale');
    assert.equal(view.selected_from, 'previous');
    assert.deepEqual(view.snapshot, previous);
    assert.equal(view.results_as_of, previous.data_as_of);
  }
  const incomplete = {...input.candidate, state: 'incomplete'};
  assert.equal(standingsSnapshotView({...input, candidate: incomplete, previous}).status, 'stale');
});

test('missing and failed first observations never become zero-point tables', () => {
  const input = {...sample(), candidate: null};
  assert.equal(standingsSnapshotView(input).status, 'empty');
  const failed = standingsSnapshotView({...input, refreshFailed: true});
  assert.equal(failed.status, 'error');
  assert.equal(failed.snapshot, null);
  assert.equal(failed.label, 'Sin datos');
  const notStarted = {...sample().candidate, state: 'not_started', rows: []};
  assert.equal(standingsSnapshotView({...input, candidate: notStarted}).snapshot, null);
  assert.equal(standingsSnapshotView({...input, candidate: notStarted}).status, 'empty');
});

test('wrong season, tournament or zone cannot supply a fallback for another scope', () => {
  for (const change of [s => s.scope.season_id = '2025', s => s.scope.provider = 'other', s => s.selection = {kind: 'tournament', tournament: 'Opening', group: 'A'}]) {
    const input = sample(), previous = structuredClone(input.candidate); change(previous);
    const view = standingsSnapshotView({...input, candidate: null, previous});
    assert.equal(view.snapshot, null);
    assert.equal(view.status, 'error');
    assert.equal(view.reasons[0].code, 'scope_mismatch');
  }
});

test('later computation of older data does not replace a newer observation', () => {
  const input = sample(), previous = structuredClone(input.candidate);
  input.candidate.data_as_of = '2026-09-24T11:57:00Z';
  input.candidate.generated_at = '2026-09-24T12:00:00Z';
  const view = standingsSnapshotView({...input, previous});
  assert.equal(view.selected_from, 'previous');
  assert.equal(view.reasons[0].code, 'older_observation');
  assert.deepEqual(view.snapshot, previous);
});

test('invalid or future timestamps and altered provenance cannot become a usable table', () => {
  for (const change of [s => s.data_as_of = null, s => s.generated_at = '2027-01-01T00:00:00Z', s => s.scope.reviewed_at = '2027-01-01T00:00:00Z', s => s.rows[0].official_position = 1, s => s.origin = 'official']) {
    const input = sample(); change(input.candidate);
    const view = standingsSnapshotView(input);
    assert.equal(view.snapshot, null);
    assert.equal(view.status, 'error');
  }
});

test('freshness requires explicit positive policies and a deterministic clock, even with empty input', () => {
  for (const patch of [{resultsTtlMs: undefined}, {reviewTtlMs: 0}, {now: undefined}, {now: NaN}]) {
    assert.throws(() => standingsSnapshotView({...sample(), candidate: null, ...patch}), /INVALID_FRESHNESS_POLICY/);
  }
});
