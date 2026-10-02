import 'server-only';
import {resolveIncidentFixture} from './incident-fixture.mjs';
import {commitIncidentSelection,previewIncidentSelection} from './incident-projection.mjs';
import {normalizeIncidents} from '../providers/bsd/incidents.mjs';
import {createIncidentObservation,storeIncidentObservation} from './incident-observations.mjs';

export async function importIncidents(db,{sample,id,mode,scope,storage='history',now=Date.now()}) {
  if(!['history','projection'].includes(storage))throw new Error('INCIDENTS_STORAGE_MODE');
  if(!['--dry-run','--apply'].includes(mode)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??''))throw new Error('INCIDENTS_USAGE');
  if(scope?.provider!=='bsd'||['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k]))throw new Error('INCIDENTS_INVALID_SCOPE');
  if(!sample||(sample.failed!==undefined&&sample.failed!==true)||(sample.failed&&sample.body!==undefined))throw new Error('INCIDENTS_INVALID_SAMPLE');
  const failed=sample.failed===true,eventId=failed?sample.event_id:sample.body?.event_id;
  normalizeIncidents(failed?{event_id:eventId,incidents:[]}:sample.body,{eventId,fetchedAt:sample.fetched_at,now});
  const fixture=await resolveIncidentFixture(db,{eventId,scope,now});
  const row=createIncidentObservation({id,fixture,body:failed?undefined:sample.body,failed,observedAt:sample.fetched_at,now});
  const result=storage==='projection'
    ?await (mode==='--apply'?commitIncidentSelection:previewIncidentSelection)(db,{fixture,observation:row,now})
    :mode==='--apply'?await storeIncidentObservation(db,row,{now}):null;
  return {mode,storage,writes:result?.stored?1:0,id,fixture_id:fixture.id,event_id:fixture.external_id,status:row.status,observed_at:row.observed_at,provider_requests:0,result};
}

export function parseIncidentImportArgs(args){
 const [path,id,mode,storageFlag,...extra]=args;
 if(!path||!id||!['--dry-run','--apply'].includes(mode)||extra.length||(storageFlag!==undefined&&!['--storage=history','--storage=projection'].includes(storageFlag)))throw new Error('INCIDENTS_USAGE');
 return {path,id,mode,storage:storageFlag?.split('=')[1]??'history'};
}
