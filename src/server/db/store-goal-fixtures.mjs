import 'server-only';

/** Persist only a validated scoped snapshot. Existing provider unique keys ensure idempotency. */
export async function storeGoalFixtures(db, normalized, scope, league, fetchedAt) {
  if (!normalized.length) throw new Error('GOAL_EMPTY_SAMPLE');
  if (league?.id !== scope.leagueId || typeof league.name !== 'string' || !league.name.trim()) throw new Error('GOAL_METADATA_MISMATCH');
  // Validate every row before the first write, even if a caller bypasses the reader.
  for (const row of normalized) {
    if (row.fixture.provider !== 'goal-api' || row.fixture.competition_external_id !== scope.leagueId || row.fixture.season !== scope.season ||
        ![row.home.external_id,row.away.external_id].includes(scope.teamId)) throw new Error('GOAL_SCOPE_MISMATCH');
  }
  const checked = async query => {const {data,error}=await query;if(error)throw new Error('GOAL_STORAGE_FAILED');return data;};
  const common = {provider:'goal-api',fetched_at:fetchedAt,source_updated_at:null};
  const competition = await checked(db.from('competitions').upsert({...common,external_id:scope.leagueId,name:league.name,country:league.countryName??null},{onConflict:'provider,external_id'}).select('id').single());
  // GOAL exposes a season label rather than a separate season entity ID.
  const season = await checked(db.from('seasons').upsert({...common,external_id:scope.season,competition_id:competition.id,name:scope.season,year:/^\d{4}$/.test(scope.season)?Number(scope.season):null},{onConflict:'provider,competition_id,external_id'}).select('id').single());
  const teams = [...new Map(normalized.flatMap(x=>[x.home,x.away]).map(x=>[x.external_id,{...common,...x}])).values()];
  const stored = await checked(db.from('teams').upsert(teams,{onConflict:'provider,external_id'}).select('id,external_id'));
  const ids = new Map(stored.map(x=>[x.external_id,x.id]));
  if (teams.some(x=>!ids.has(x.external_id))) throw new Error('GOAL_STORAGE_FAILED');
  const fixtures = normalized.map(({home,away,fixture})=>{
    const {competition_external_id,season:seasonLabel,source_round,...values}=fixture;
    // Scope-only fields are not SQL columns; preserve text round separately from BSD's integer round.
    void competition_external_id; void seasonLabel;
    return {...values,source_round:null,source_round_label:source_round,season_id:season.id,home_team_id:ids.get(home.external_id),away_team_id:ids.get(away.external_id)};
  });
  await checked(db.from('fixtures').upsert(fixtures,{onConflict:'provider,external_id'}));
  return {fixtures:fixtures.length,teams:teams.length};
}
