// Home changes panels only from a recent, persisted and verified live fixture.
const ACTIVE_PHASES = new Set(['first_half', 'halftime', 'second_half', 'extra_time', 'penalties']);

export function liveHomeMode(session, fixtureSnapshot, now, maxAgeMs = 360_000) {
  if (!session?.enabled || !ACTIVE_PHASES.has(session.phase) ||
      fixtureSnapshot?.fixture_id !== session.fixture_id ||
      !['complete', 'partial'].includes(fixtureSnapshot.last_quality) ||
      fixtureSnapshot.last_good_payload == null) return 'regular';

  const observedAt = Date.parse(fixtureSnapshot.last_good_at ?? '');
  if (!Number.isFinite(now) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0 ||
      !Number.isFinite(observedAt) || observedAt > now || now - observedAt > maxAgeMs) return 'regular';

  return 'live';
}
