import {test} from 'node:test';
import assert from 'node:assert/strict';
import {officialReviewSample} from './fixtures/official-review.mjs';
import {runManualReview} from '../src/server/standings/manual-review.mjs';

function sample() {
  const o = officialReviewSample();
  return {request: {id: o.id, batch: o.batch, evidence: o.evidence, requestActivation: true,
    reviewedAt: new Date(o.now).toISOString()}, policy: o.policy, now: o.now};
}

test('manual dry-run reports eligibility without constructing DB or claiming activation', async () => {
  const report = await runManualReview({...sample(), mode: '--dry-run', getDb: () => assert.fail('DB accessed')});
  assert.equal(report.eligible_for_activation, true);
  assert.equal(report.activated, false); assert.equal(report.stored, false);
});

test('manual request rejects future review, unknown mode and invalid policy before DB', async () => {
  const s = sample();
  for (const override of [{mode: '--activate'}, {now: s.now - 1}, {policy: {...s.policy, resultsTtlMs: 0}},
    {request: {...s.request, extra: true}}, {request: {...s.request, requestActivation: 'true'}}]) {
    await assert.rejects(runManualReview({...s, mode: '--dry-run', ...override, getDb: () => assert.fail('DB accessed')}), /OFFICIAL_REVIEW_/);
  }
});

test('manual review cannot use an old review time to bypass current expiry', async () => {
  const s = sample();
  await assert.rejects(runManualReview({...s, now: s.now + 86400000, mode: '--apply', getDb: () => assert.fail('DB accessed')}), /OFFICIAL_REVIEW_EXPIRED/);
});

test('manual audit without activation stores only the immutable review and reports differences', async () => {
  const s = sample(); s.request.requestActivation = false;
  s.request.evidence.tables[0].rows[0].pts--;
  let stored;
  const report = await runManualReview({...s, mode: '--apply', getDb: () => ({from: table => {
    assert.equal(table, 'standings_official_reviews');
    return {insert: async row => {stored = row; return {error: null};}};
  }})});
  assert.equal(report.status, 'differences'); assert.equal(report.stored, true);
  assert.equal(stored.activated, false); assert.equal(report.activated, false);
});
