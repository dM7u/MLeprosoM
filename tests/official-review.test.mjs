import {test} from 'node:test';
import assert from 'node:assert/strict';
import {officialReviewSample} from './fixtures/official-review.mjs';
import {createOfficialReview} from '../src/server/standings/official-review.mjs';
import {storeOfficialReview as store} from '../src/server/db/store-official-review.mjs';
const storeOfficialReview = (db, options) => store(db, options, {now: options.now});
import {createStandingsBatch} from '../src/server/standings/batch.mjs';

test('all 90 official rows bind to one exact batch; activation is explicit and remains provisional', () => {
  const options = officialReviewSample(), before = structuredClone(options);
  const review = createOfficialReview(options);
  assert.equal(review.status, 'match'); assert.equal(review.activated, true);
  assert.equal(review.payload.evidence.tables.reduce((n, t) => n + t.rows.length, 0), 90);
  assert.deepEqual(options, before);
  assert.equal(createOfficialReview({...options, requestActivation: false}).activated, false);
  assert.ok(options.batch.payload.snapshots.every(s => s.rows.every(r => r.official_position === null)));
});

test('different batch/hash, missing zones, duplicate tables, partial rows and invalid scores fail', () => {
  for (const change of [o => o.evidence.batch_id = 'other', o => o.evidence.payload_hash = '0'.repeat(64),
    o => o.evidence.tables.pop(), o => o.evidence.tables.push(o.evidence.tables[0]), o => o.evidence.tables[0].rows.pop(),
    o => o.evidence.tables[0].rows[0].pts = null, o => o.evidence.tables[0].source = 'http://example.org']) {
    const options = officialReviewSample(); change(options);
    assert.throws(() => createOfficialReview(options), /INVALID_OFFICIAL_REVIEW/);
  }
});

test('official differences are persisted as findings, never applied as automatic sanctions', () => {
  const options = officialReviewSample(); options.evidence.tables[0].rows[0].pts--;
  const review = createOfficialReview(options);
  assert.equal(review.status, 'differences'); assert.equal(review.activated, false);
  assert.equal(review.payload.differences[0].field, 'pts');
  assert.ok(review.payload.reasons.includes('official_differences'));
});

test('expired evidence/results/review or evidence predating catalog blocks activation', () => {
  for (const patch of [{evidenceTtlMs: 1}, {resultsTtlMs: 1}, {reviewTtlMs: 1}]) {
    const options = officialReviewSample(); Object.assign(options.policy, patch);
    const review = createOfficialReview(options); assert.equal(review.status, 'match'); assert.equal(review.activated, false);
  }
  const options = officialReviewSample(); options.evidence.observed_at = '2026-09-23T00:00:00Z';
  assert.ok(createOfficialReview(options).payload.reasons.includes('evidence_predates_catalog'));
  options.evidence.observed_at = '2027-01-01T00:00:00Z';
  assert.throws(() => createOfficialReview(options), /BINDING/);
});

test('an incomplete batch cannot be activated despite a complete official transcription', () => {
  const options = officialReviewSample(), input = structuredClone(options.batch.payload.input); input.fixtures.pop();
  options.batch = createStandingsBatch({id: options.batch.id, input, generatedAt: options.batch.generated_at});
  options.evidence.payload_hash = options.batch.payload_hash;
  const review = createOfficialReview(options);
  assert.equal(review.status, 'unavailable'); assert.equal(review.activated, false);
});

test('review storage is idempotent and rejects reused review IDs with altered findings', async () => {
  let saved;
  const db = {from: () => ({insert: async row => {if (saved) return {error: {code: '23505'}}; saved = structuredClone(row); return {error: null};},
    select: () => ({eq: () => ({single: async () => ({data: saved})})})})};
  const options = officialReviewSample();
  assert.equal((await storeOfficialReview(db, options)).activated, true);
  assert.equal((await storeOfficialReview(db, options)).replay, true);
  options.evidence.tables[0].rows[0].pts--;
  await assert.rejects(storeOfficialReview(db, options), /IDEMPOTENCY_CONFLICT/);
});

test('invalid policies reject before writes and transport errors remain sanitized', async () => {
  const options = officialReviewSample();
  await assert.rejects(storeOfficialReview({from: () => assert.fail('no write')}, {...options, policy: {}}), /POLICY/);
  await assert.rejects(storeOfficialReview({from: () => {throw Error('secret');}}, options), {message: 'OFFICIAL_REVIEW_STORAGE_FAILED'});
});

test('activation cannot be written after expiring or with a future review clock', async () => {
  const options = officialReviewSample(), db = {from: () => assert.fail('no write')};
  await assert.rejects(store(db, options, {now: options.now + 86400000 * 2}), /OFFICIAL_REVIEW_EXPIRED/);
  await assert.rejects(store(db, options, {now: options.now - 1}), /OFFICIAL_REVIEW_INVALID_TIME/);
});
