import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStandingsBatch, validateStandingsBatch} from '../src/server/standings/batch.mjs';
import {storeStandingsBatch as store} from '../src/server/db/store-standings-batch.mjs';
const storeStandingsBatch = (db, batch) => store(db, batch, {now: Date.parse('2026-09-25T00:00:00Z')});

export function batchSample() {
  const scope = {provider: 'test', competition_id: 'L', season_id: 'S', source: 'synthetic review', reviewed_at: '2026-09-24T00:00:00Z'};
  const schedule = [{id: '1', tournament: 'Opening', round: 1, home_id: 'a', away_id: 'b'}];
  return createStandingsBatch({id: '00000000-0000-4000-8000-000000000001', generatedAt: '2026-09-24T02:00:00Z', input: {
    scope, schedule, teams: [{id: 'a', groups: {Opening: 'A'}}, {id: 'b', groups: {Opening: 'B'}}],
    fixtures: [{...schedule[0], provider: 'test', competition_id: 'L', season_id: 'S', state: 'finished', home_score: 1, away_score: 0, fetched_at: '2026-09-24T01:00:00Z'}],
  }});
}

test('batch contains reproducible normalized input and all scopes; extra fields are not persisted', () => {
  const row = batchSample();
  assert.equal(row.payload.snapshots.length, 4);
  assert.equal(row.status, 'complete');
  assert.equal(row.payload.input.fixtures[0].tournament, undefined);
  assert.deepEqual(validateStandingsBatch(row), row);
  const input = structuredClone(row.payload.input); input.authorization = 'secret'; input.fixtures[0].api_key = 'secret';
  const rebuilt = createStandingsBatch({id: row.id, generatedAt: row.generated_at, input});
  assert.equal(JSON.stringify(rebuilt).includes('secret'), false);
  assert.equal(rebuilt.payload_hash, row.payload_hash);
});

test('modified totals, scope, versions, metadata and additional payload fields fail before writing', async () => {
  for (const change of [r => r.payload.snapshots[0].rows[0].pts = 99, r => r.provider = 'other', r => r.contract_version = 2,
    r => r.payload.secret = 'private', r => r.input_hash = '0'.repeat(64), r => r.payload.snapshots.pop()]) {
    const row = batchSample(); change(row);
    await assert.rejects(storeStandingsBatch({from: () => assert.fail('must not write')}, row), /INVALID_STANDINGS_BATCH/);
  }
});

test('incomplete input persists only as an incomplete audit batch without invented rows', () => {
  const row = batchSample(), input = structuredClone(row.payload.input); input.fixtures = [];
  const incomplete = createStandingsBatch({id: row.id, generatedAt: row.generated_at, input});
  assert.equal(incomplete.status, 'incomplete');
  assert.equal(incomplete.data_as_of, null);
  assert.ok(incomplete.payload.snapshots.every(s => !s.rows.length));
  assert.deepEqual(validateStandingsBatch(incomplete), incomplete);
});

test('retry identical batch is a no-op and conflicting reuse of ID is refused', async () => {
  let saved = null, inserts = 0;
  const db = {from: () => ({
    insert: async row => {inserts++; if (saved) return {error: {code: '23505'}}; saved = structuredClone(row); return {error: null};},
    select: () => ({eq: () => ({single: async () => ({data: saved, error: null})})}),
  })};
  const row = batchSample();
  assert.equal((await storeStandingsBatch(db, row)).stored, true);
  assert.equal((await storeStandingsBatch(db, row)).replay, true);
  const changed = createStandingsBatch({id: row.id, input: row.payload.input, generatedAt: '2026-09-24T03:00:00Z'});
  await assert.rejects(storeStandingsBatch(db, changed), /STANDINGS_IDEMPOTENCY_CONFLICT/);
  assert.equal(inserts, 3);
  assert.equal(saved.generated_at, row.generated_at);
});

test('storage errors are sanitized, including uncertain network writes', async () => {
  for (const insert of [async () => ({error: {code: '42501', message: 'secret'}}), async () => {throw Error('secret');}]) {
    await assert.rejects(storeStandingsBatch({from: () => ({insert})}, batchSample()), {message: 'STANDINGS_STORAGE_FAILED'});
  }
});

test('future batches cannot be written even if their hashes and calculations are consistent', async () => {
  await assert.rejects(store({from: () => assert.fail('must not write')}, batchSample(), {now: Date.parse('2026-09-23T00:00:00Z')}), /INVALID_STANDINGS_BATCH_TIME/);
});
