import {normalizedFixtureStatus} from './fixture-format.mjs';

export function dashboardFixtures(fixtures, now) {
  const finished = fixtures.filter(f => normalizedFixtureStatus(f.provider, f.source_status) === 'finished')
    .sort((a,b) => (Date.parse(b.kickoff_at) || 0) - (Date.parse(a.kickoff_at) || 0));
  const upcoming = fixtures.filter(f => normalizedFixtureStatus(f.provider, f.source_status) === 'notstarted' && Date.parse(f.kickoff_at) >= now)
    .sort((a,b) => Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at));
  const unresolved = fixtures.filter(f => !finished.includes(f) && !upcoming.includes(f));
  return {finished, upcoming, unresolved};
}

export function defaultTournament(fixtures, tournaments, now) {
  const relevant = fixtures.filter(f => tournaments.includes(f.tournament?.name) && Number.isFinite(Date.parse(f.kickoff_at)));
  const past = relevant.filter(f => Date.parse(f.kickoff_at) <= now).sort((a,b) => Date.parse(b.kickoff_at)-Date.parse(a.kickoff_at));
  const future = relevant.filter(f => Date.parse(f.kickoff_at) > now).sort((a,b) => Date.parse(a.kickoff_at)-Date.parse(b.kickoff_at));
  return past[0]?.tournament?.name ?? future[0]?.tournament?.name ?? 'Anual';
}
