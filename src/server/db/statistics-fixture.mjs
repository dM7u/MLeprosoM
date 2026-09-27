import 'server-only';

export async function resolveStatisticsFixture(db,{eventId,scope}){
  if (scope?.provider !== 'bsd' || ['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k].trim())) throw new Error('STATS_INVALID_SCOPE');
  if(!Number.isSafeInteger(eventId)||eventId<=0)throw new Error('STATS_USAGE');
  let fixture;
  try {
    const team=await db.from('teams').select('id').eq('provider',scope.provider).eq('external_id',scope.externalTeamId).maybeSingle();
    if(team.error) throw new Error('STATS_LOOKUP_FAILED');
    if(!team.data) throw new Error('STATS_OUT_OF_SCOPE');
    const result=await db.from('fixtures')
      .select('id,provider,external_id,home_team_id,away_team_id,seasons!inner(external_id,competitions!inner(external_id))')
      .eq('provider',scope.provider).eq('external_id',String(eventId))
      .eq('seasons.external_id',scope.seasonId).eq('seasons.competitions.external_id',scope.competitionId).maybeSingle();
    if(result.error) throw new Error('STATS_LOOKUP_FAILED');
    fixture=result.data;
    if(!fixture || ![fixture.home_team_id,fixture.away_team_id].includes(team.data.id) ||
      fixture.provider!==scope.provider || fixture.external_id!==String(eventId) ||
      fixture.seasons?.external_id!==scope.seasonId || fixture.seasons?.competitions?.external_id!==scope.competitionId)
      throw new Error('STATS_OUT_OF_SCOPE');
  }catch(error){throw new Error(error.message==='STATS_OUT_OF_SCOPE'?error.message:'STATS_LOOKUP_FAILED');}
  return fixture;
}
