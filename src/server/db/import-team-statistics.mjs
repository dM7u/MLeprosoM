import 'server-only';
import {normalizeTeamStatistics} from '../providers/bsd/team-statistics.mjs';
import {createStatisticsObservation,storeStatisticsObservation} from './team-statistics.mjs';

/** Import saved evidence only; retries never fetch a changed provider response. */
export async function importTeamStatistics(db,{sample,id,mode,scope,now=Date.now()}) {
  if (!['--dry-run','--apply'].includes(mode) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??'')) throw new Error('STATS_USAGE');
  if (scope?.provider !== 'bsd' || ['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k].trim())) throw new Error('STATS_INVALID_SCOPE');
  if (!sample || typeof sample.fetched_at!=='string' || (sample.failed!==undefined && sample.failed!==true)) throw new Error('STATS_INVALID_SAMPLE');
  const failed=sample.failed===true;
  if (failed && sample.body!==undefined) throw new Error('STATS_INVALID_SAMPLE');
  const eventId=failed?sample.event_id:sample.body?.event_id;
  normalizeTeamStatistics(failed?{event_id:eventId,stats:{}}:sample.body,{eventId,fetchedAt:sample.fetched_at,now});
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
  const observation=createStatisticsObservation({id,fixture,body:failed?undefined:sample.body,failed,observedAt:sample.fetched_at,now});
  const result=mode==='--apply'?await storeStatisticsObservation(db,observation,{now}):null;
  return {mode,id,fixture_id:fixture.id,event_id:String(eventId),status:observation.status,
    observed_at:observation.observed_at,provider_requests:0,published:false,result};
}
