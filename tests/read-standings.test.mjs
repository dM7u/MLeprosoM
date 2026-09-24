import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readStandings} from '../src/server/db/read-standings.mjs';
import {officialReviewSample} from './fixtures/official-review.mjs';
import {createOfficialReview} from '../src/server/standings/official-review.mjs';
import {createStandingsBatch} from '../src/server/standings/batch.mjs';

function sample() {
  const o = officialReviewSample();
  return {o, batches: [o.batch], reviews: [createOfficialReview(o)], args: {
    scope: o.batch.payload.input.scope, selection: {kind: 'annual'}, policy: o.policy, now: o.now + 3600000,
  }};
}

// Read-only Supabase-shaped fake; verifies filters/order/limit, not writes or provider calls.
function database(state, onQuery = () => null) {
  let calls = 0;
  return {from: table => {
    assert.ok(['standings_batches', 'standings_official_reviews'].includes(table));
    const filters = [], ordering = []; let limit = Infinity, single = false;
    const query = {
      select: () => query, eq: (k, v) => {filters.push(r => r[k] === v); return query;},
      in: (k, values) => {filters.push(r => values.includes(r[k])); return query;},
      order: (k, opts) => {ordering.push([k, opts]); return query;}, limit: n => {limit = n; return query;},
      single: () => {single = true; return query;},
      then: (resolve, reject) => Promise.resolve().then(() => {
        const override = onQuery(++calls, table); if (override) return override;
        const rows = structuredClone(table === 'standings_batches' ? state.batches : state.reviews).filter(r => filters.every(f => f(r)));
        rows.sort((a, b) => {for (const [k, opts] of ordering) {const result = (Date.parse(a[k]) || 0) - (Date.parse(b[k]) || 0); if (result) return opts.ascending ? result : -result;} return 0;});
        return {data: single ? rows[0] : rows.slice(0, limit), error: null};
      }).then(resolve, reject),
    }; return query;
  }};
}

test('reads scoped approved table, validates SQL timestamp spellings, returns provisional rows', async () => {
  const s = sample();
  s.batches[0].generated_at = new Date(s.batches[0].generated_at).toISOString();
  s.batches[0].data_as_of = new Date(s.batches[0].data_as_of);
  const view = await readStandings(database(s), s.args);
  assert.equal(view.status, 'fresh'); assert.equal(view.snapshot.rows.length, 30);
  assert.equal(view.batch_id, s.o.batch.id); assert.equal(view.official_status, 'unverified');
  assert.ok(view.snapshot.rows.every(r => r.official_position === null));
  const foreign = await readStandings(database(s), {...s.args, scope: {...s.args.scope, season_id: 'foreign'}});
  assert.equal(foreign.status, 'empty'); assert.equal(foreign.snapshot, null);
});

test('latest denial supersedes an earlier approval of the same batch', async () => {
  const s = sample();
  s.reviews.push(createOfficialReview({...s.o, id: '20000000-0000-4000-8000-000000000002', now: s.o.now + 1000, requestActivation: false}));
  const view = await readStandings(database(s), s.args);
  assert.equal(view.snapshot, null); assert.ok(view.read_issues.includes('latest_review_denied'));
});

test('conflicting reviews at the same time are blocked regardless of return order', async () => {
  const s = sample();
  s.reviews.push(createOfficialReview({...s.o, id: '20000000-0000-4000-8000-000000000002', requestActivation: false}));
  for (const reviews of [s.reviews, [...s.reviews].reverse()]) {
    const view = await readStandings(database({...s, reviews}), s.args);
    assert.equal(view.status, 'error'); assert.deepEqual(view.read_issues, ['ambiguous_latest_review']);
  }
});

test('newer unreviewed batch retains older approved data only as stale', async () => {
  const s = sample();
  s.batches.push(createStandingsBatch({id: '10000000-0000-4000-8000-000000000002', input: s.o.batch.payload.input, generatedAt: '2026-09-24T01:10:00Z'}));
  const view = await readStandings(database(s), s.args);
  assert.equal(view.batch_id, s.o.batch.id); assert.equal(view.status, 'stale');
  assert.ok(view.read_issues.includes('unreviewed_batch'));
});

test('evidence and data expire at read time without erasing previous approved observations', async () => {
  const s = sample();
  const evidence = await readStandings(database(s), {...s.args, policy: {...s.args.policy, evidenceTtlMs: 1}});
  assert.equal(evidence.status, 'stale'); assert.ok(evidence.warnings.includes('stale_evidence'));
  assert.equal(evidence.snapshot.rows.length, 30);
  const data = await readStandings(database(s), {...s.args, policy: {...s.args.policy, resultsTtlMs: 1}});
  assert.equal(data.status, 'stale'); assert.ok(data.warnings.includes('stale_results'));
});

test('missing schema or interrupted review read returns sanitized error; empty storage remains empty', async () => {
  const s = sample();
  for (const call of [1, 2, 3, 4]) {
    const view = await readStandings(database(s, n => n === call ? {error: {message: 'private database error'}} : null), s.args);
    assert.equal(view.status, 'error'); assert.equal(view.snapshot, null); assert.equal(JSON.stringify(view).includes('private'), false);
  }
  assert.equal((await readStandings(database({...s, batches: [], reviews: []}), s.args)).status, 'empty');
});

test('corrupt batch/review payloads fail validation instead of publishing altered points', async () => {
  for (const change of [s => s.batches[0].payload.snapshots[0].rows[0].pts = 99, s => s.reviews[0].activated = false, s => s.reviews[0].batch_payload_hash = '0'.repeat(64)]) {
    const s = sample(); change(s);
    const view = await readStandings(database(s), s.args);
    assert.equal(view.status, 'error'); assert.equal(view.snapshot, null);
  }
});

test('review changes during the read and oversized history fail closed', async () => {
  const s = sample();
  const changed = await readStandings(database(s, n => n === 4 ? {data: [{...s.reviews[0], id: 'new', reviewed_at: new Date(s.o.now + 1000).toISOString(), activated: false}]} : null), s.args);
  assert.deepEqual(changed.read_issues, ['review_changed_during_read']);
  const large = await readStandings(database(s, n => n === 1 ? {data: Array(101).fill(s.batches[0])} : null), s.args);
  assert.deepEqual(large.read_issues, ['history_limit_exceeded']);
});
