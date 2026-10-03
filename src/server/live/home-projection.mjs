import {liveHomeMode} from './home-mode.mjs';

const validScore = value => value === null || (Number.isSafeInteger(value) && value >= 0);

export function projectLiveHome(fixtures, sessions, snapshots, now) {
  const byId = new Map(fixtures.filter(f => f.provider === 'bsd').map(f => [f.id, f]));
  const fixtureSnapshots = new Map(snapshots.filter(s => s.resource === 'fixture').map(s => [s.fixture_id, s]));
  let live = null;
  const updates = new Map();
  for (const session of sessions) {
    const fixture = byId.get(session.fixture_id);
    const snapshot = fixtureSnapshots.get(session.fixture_id);
    const payload = snapshot?.last_good_payload;
    if (!fixture || !snapshot || !payload || payload.provider !== 'bsd' ||
        payload.event_id !== fixture.external_id || payload.version !== 1 ||
        !validScore(payload.home_score) || !validScore(payload.away_score)) continue;
    if (payload.phase === 'finished' && payload.source_status === 'finished' &&
        Number.isFinite(Date.parse(snapshot.last_good_at ?? ''))) {
      updates.set(fixture.id, {...fixture, source_status: 'finished',
        home_score: payload.home_score, away_score: payload.away_score});
    }
    if (liveHomeMode(session, snapshot, now) === 'live' && payload.phase === session.phase) {
      if (!live || Date.parse(snapshot.last_good_at) > Date.parse(live.observedAt)) {
        live = {fixture, payload, observedAt: snapshot.last_good_at};
      }
    }
  }
  return {fixtures: fixtures.map(f => updates.get(f.id) ?? f), live};
}
