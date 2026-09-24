import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBsdCatalog} from '../src/server/providers/bsd/catalog.mjs';
import {runBsdStandings, compareReviewedTables} from '../src/server/standings/bsd-adapter.mjs';

const load = name => JSON.parse(readFileSync(new URL(`../docs/research/${name}`, import.meta.url)));
const review = load('lpf-2026-standings-review.json');
const mapping = load('lpf-2026-competition-map.json');
const catalog = load('bsd-catalog-20260924.json');
const generatedAt = '2026-09-24T23:59:59Z';
const run = (c = catalog, r = review, m = mapping) => runBsdStandings(c, m, r, generatedAt);
const simple = id => ({id, league_id: 85, season_id: 1635});
const next = offset => `https://sports.bzzoiro.com/api/v2/events/?league_id=85&season_id=1635&limit=2&offset=${offset}`;
const options = fetcher => ({leagueId: 85, seasonId: 1635, apiKey: 'test-private-key', pageSize: 2, fetcher});

test('catalog paginates the whole league with a fixed scope and no team filter', async () => {
  const calls = [];
  const result = await readBsdCatalog(options(async (url, init) => {
    calls.push(url);
    assert.equal(init.headers.Authorization, 'Token test-private-key');
    assert.equal(url.searchParams.has('team_id'), false);
    assert.equal(url.searchParams.get('offset'), calls.length === 1 ? '0' : '2');
    return Response.json(calls.length === 1 ? {count: 3, results: [simple(1), simple(2)], next: next(2)} : {count: 3, results: [simple(3)], next: null});
  }));
  assert.equal(result.count, 3);
  assert.equal(result.pages, 2);
  assert.equal(result.observations.length, 3);
});

test('catalog rejects early truncation, changed totals, repeated IDs and foreign scope', async () => {
  for (const second of [
    {count: 4, results: [simple(3)], next: null},
    {count: 3, results: [], next: null},
    {count: 3, results: [simple(2)], next: null},
    {count: 3, results: [{...simple(3), season_id: 2025}], next: null},
  ]) {
    let calls = 0;
    await assert.rejects(readBsdCatalog(options(async () => Response.json(++calls === 1 ? {count: 3, results: [simple(1), simple(2)], next: next(2)} : second))), /BSD_/);
    assert.equal(calls, 2);
  }
});

test('catalog never follows a hostile or scope-changing next URL; budgets cap requests', async () => {
  for (const url of ['https://example.org/steal', next(0), next(2) + '&team_id=4997', next(2).replace('1635', '2025'), null]) {
    let calls = 0;
    await assert.rejects(readBsdCatalog(options(async () => {calls++; return Response.json({count: 3, results: [simple(1), simple(2)], next: url});})), /BSD_INVALID_CATALOG_NEXT/);
    assert.equal(calls, 1);
  }
  await assert.rejects(readBsdCatalog({...options(async () => Response.json({count: 3, results: [simple(1), simple(2)], next: next(2)})), maxPages: 1}), /BUDGET/);
});

test('catalog stops on rate limit without exposing credentials or provider response', async () => {
  let calls = 0;
  await assert.rejects(readBsdCatalog(options(async () => {calls++; return new Response('private body', {status: 429});})), {message: 'BSD_HTTP_429'});
  assert.equal(calls, 1);
});

test('current observed full catalog reproduces all 90 official rows, separate from historical evidence', () => {
  const before = structuredClone(catalog);
  const report = run();
  assert.equal(report.catalog_count, 496);
  assert.equal(report.excluded.length, 16);
  assert.equal(report.snapshots[0].coverage.finished, 390);
  assert.equal(report.snapshots.length, 7);
  const comparisons = compareReviewedTables(report, review.official_tables);
  assert.equal(comparisons.reduce((n, c) => n + c.compared, 0), 90);
  assert.ok(comparisons.every(c => c.state === 'match'));
  assert.ok(report.snapshots.every(s => s.rows.every(r => r.official_position === null) && s.adjustments_status === 'unverified'));
  assert.deepEqual(catalog, before);
});

test('a new unmapped league fixture blocks every table rather than silently disappearing', () => {
  const c = structuredClone(catalog); c.rows.push({...c.rows[0], id: 9999999}); c.count++;
  const report = run(c);
  assert.equal(report.audit_issues[0].code, 'unreviewed_catalog_entry');
  assert.ok(report.snapshots.every(s => s.state === 'incomplete' && !s.rows.length));
});

test('reviewed replacement counts once and refuses changed old record or missing new record', () => {
  const c = structuredClone(catalog);
  c.rows.find(r => r.id === 223766).status = 'finished';
  assert.ok(run(c).audit_issues.some(i => i.code === 'changed_replaced_fixture'));
  const missing = structuredClone(catalog);
  missing.rows = missing.rows.filter(r => r.id !== 604493); missing.count--;
  assert.equal(run(missing).snapshots[0].state, 'incomplete');
  const wrong = structuredClone(review); wrong.replacements[0].home_id = '755';
  assert.throws(() => run(catalog, wrong), /REPLACEMENT/);
});

test('only verified finished and notstarted states are accepted; unknown and postponed suppress totals', () => {
  for (const status of ['postponed', 'live', 'unknown', 'FT']) {
    const c = structuredClone(catalog); c.rows.find(r => r.id === 604493).status = status;
    assert.equal(run(c).snapshots[0].state, 'incomplete');
  }
  const c = structuredClone(catalog); c.rows.find(r => r.id === 604493).home_score = 99;
  assert.deepEqual(run(c).snapshots[0].rows, run().snapshots[0].rows);
});

test('shared calendar omissions and membership loss fail reviewed structural expectations', () => {
  const m = structuredClone(mapping); m.rows.pop();
  assert.throws(() => run(catalog, review, m), /REVIEW/);
  const r = structuredClone(review); delete r.teams[0].groups.Clausura;
  assert.throws(() => run(catalog, r), /REVIEW/);
});

test('changes in stage, scope, score and home/away cannot produce a plausible complete annual', () => {
  for (const patch of [{stage: 'final'}, {home_score: null}, {home_team_id: 1}, {round_number: 99}]) {
    const c = structuredClone(catalog);
    Object.assign(c.rows.find(r => r.status === 'finished' && r.stage === 'group-stage'), patch);
    assert.equal(run(c).snapshots[0].state, 'incomplete');
  }
  const c = structuredClone(catalog); c.rows[0].league_id = 86;
  assert.throws(() => run(c), /SCOPE_MISMATCH/);
});
