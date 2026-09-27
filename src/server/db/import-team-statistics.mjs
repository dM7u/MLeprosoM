import {resolveStatisticsFixture} from './statistics-fixture.mjs';
import {commitStatisticsSelection,previewStatisticsSelection} from './statistics-projection.mjs';
import 'server-only';
import {normalizeTeamStatistics} from '../providers/bsd/team-statistics.mjs';
import {createStatisticsObservation,storeStatisticsObservation} from './team-statistics.mjs';

/** Import saved evidence only; retries never fetch a changed provider response. */
export async function importTeamStatistics(db,{sample,id,mode,scope,storage='history',now=Date.now()}) {
  if(!['history','projection'].includes(storage))throw new Error('STATS_STORAGE_MODE');
  if (!['--dry-run','--apply'].includes(mode) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??'')) throw new Error('STATS_USAGE');
  if (scope?.provider !== 'bsd' || ['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k].trim())) throw new Error('STATS_INVALID_SCOPE');
  if (!sample || typeof sample.fetched_at!=='string' || (sample.failed!==undefined && sample.failed!==true)) throw new Error('STATS_INVALID_SAMPLE');
  const failed=sample.failed===true;
  if (failed && sample.body!==undefined) throw new Error('STATS_INVALID_SAMPLE');
  const eventId=failed?sample.event_id:sample.body?.event_id;
  normalizeTeamStatistics(failed?{event_id:eventId,stats:{}}:sample.body,{eventId,fetchedAt:sample.fetched_at,now});
  const fixture=await resolveStatisticsFixture(db,{eventId,scope});
  const observation=createStatisticsObservation({id,fixture,body:failed?undefined:sample.body,failed,observedAt:sample.fetched_at,now});
  const result=storage==='projection'
    ?await (mode==='--apply'?commitStatisticsSelection:previewStatisticsSelection)(db,{fixture,observation,now})
    :mode==='--apply'?await storeStatisticsObservation(db,observation,{now}):null;
  return {mode,storage,writes:result?.stored?1:0,id,fixture_id:fixture.id,event_id:String(eventId),status:observation.status,
    observed_at:observation.observed_at,provider_requests:0,published:false,result};
}

export function parseStatisticsImportArgs(args){
 const [path,id,mode,storageFlag,...extra]=args;
 if(!path||!id||!['--dry-run','--apply'].includes(mode)||extra.length||(storageFlag!==undefined&&!['--storage=history','--storage=projection'].includes(storageFlag)))throw new Error('STATS_USAGE');
 return {path,id,mode,storage:storageFlag?.split('=')[1]??'history'};
}
