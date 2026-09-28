import 'server-only';
import {resolveLineupFixture} from './lineup-fixture.mjs';
import {commitLineupSelection,previewLineupSelection} from './lineup-projection.mjs';
import {normalizeLineups} from '../providers/bsd/lineups.mjs';
import {createLineupObservation,storeLineupObservation} from './lineup-observations.mjs';

export async function importLineups(db,{sample,id,mode,scope,storage='history',now=Date.now()}) {
  if(!['history','projection'].includes(storage))throw new Error('LINEUPS_STORAGE_MODE');
  if(!['--dry-run','--apply'].includes(mode)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??''))throw new Error('LINEUPS_USAGE');
  if(scope?.provider!=='bsd'||['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k]))throw new Error('LINEUPS_INVALID_SCOPE');
  const body=sample?.body;
  normalizeLineups(body,{eventId:body?.event_id,homeTeamId:body?.lineups?.home?.team_id,
    awayTeamId:body?.lineups?.away?.team_id,fetchedAt:sample?.fetched_at,now});
  const fixture=await resolveLineupFixture(db,{eventId:body.event_id,scope,now});
  const row=createLineupObservation({id,fixture,body,observedAt:sample.fetched_at,now});
  const result=storage==='projection'
    ?await (mode==='--apply'?commitLineupSelection:previewLineupSelection)(db,{fixture,observation:row,now})
    :mode==='--apply'?await storeLineupObservation(db,row,{now}):null;
  return {mode,storage,writes:result?.stored?1:0,id,fixture_id:fixture.id,event_id:fixture.external_id,status:row.status,observed_at:row.observed_at,provider_requests:0,result};
}

export function parseLineupImportArgs(args){
 const [path,id,mode,storageFlag,...extra]=args;
 if(!path||!id||!['--dry-run','--apply'].includes(mode)||extra.length||(storageFlag!==undefined&&!['--storage=history','--storage=projection'].includes(storageFlag)))throw new Error('LINEUPS_USAGE');
 return {path,id,mode,storage:storageFlag?.split('=')[1]??'history'};
}
