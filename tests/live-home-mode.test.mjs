import test from 'node:test';
import assert from 'node:assert/strict';
import {liveHomeMode} from '../src/server/live/home-mode.mjs';

const now = Date.parse('2026-10-03T20:30:00Z');
const session = {fixture_id: 'fixture-1', enabled: true, phase: 'first_half'};
const snapshot = {fixture_id: 'fixture-1', last_quality: 'complete', last_good_at: '2026-10-03T20:29:00Z', last_good_payload: {status: '1st_half'}};

test('Home switches only on a fresh verified active snapshot', () => {
  assert.equal(liveHomeMode(session, snapshot, now), 'live');
  assert.equal(liveHomeMode({...session, phase: 'halftime'}, snapshot, now), 'live');
  assert.equal(liveHomeMode({...session, phase: 'finished'}, snapshot, now), 'regular');
  assert.equal(liveHomeMode({...session, enabled: false}, snapshot, now), 'regular');
});

test('stale, mismatched and unavailable data cannot announce live play', () => {
  assert.equal(liveHomeMode(session, {...snapshot, fixture_id: 'other'}, now), 'regular');
  assert.equal(liveHomeMode(session, {...snapshot, last_good_at: '2026-10-03T20:20:00Z'}, now), 'regular');
  assert.equal(liveHomeMode(session, {...snapshot, last_good_at: '2026-10-03T20:31:00Z'}, now), 'regular');
  assert.equal(liveHomeMode(session, {...snapshot, last_quality: 'failed'}, now), 'regular');
  assert.equal(liveHomeMode(session, {...snapshot, last_good_payload: null}, now), 'regular');
  assert.equal(liveHomeMode({...session, phase: 'unknown'}, snapshot, now), 'regular');
});
