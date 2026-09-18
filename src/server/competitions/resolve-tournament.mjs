import 'server-only';

/** Explicit reviewed event IDs; never infer a tournament from kickoff time. */
export function createTournamentResolver(mapping) {
  const rows=new Map();
  for(const row of mapping.rows){
    const key=String(row.bsd_event_id);
    if(rows.has(key)||!['Apertura','Clausura'].includes(row.tournament)||!Number.isSafeInteger(row.round)||row.round<1)throw new Error('INVALID_TOURNAMENT_MAP');
    rows.set(key,row);
  }
  return fixture=>{
    if(fixture.provider!==mapping.provider || fixture.competition_external_id!==String(mapping.provider_competition_id) || fixture.season_external_id!==String(mapping.provider_season_id))return null;
    const row=rows.get(fixture.external_id);
    if(!row || fixture.home_external_id!==String(row.home_team_id) || fixture.away_external_id!==String(row.away_team_id) || fixture.source_round!==row.round)return null;
    return {name:row.tournament,round:row.round,source:mapping.official_source,verifiedAt:mapping.verified_at};
  };
}
