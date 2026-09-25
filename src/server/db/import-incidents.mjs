import 'server-only';
import {readTeamFixtures} from './read-fixtures.mjs';
import {normalizeIncidents} from '../providers/bsd/incidents.mjs';
import {createIncidentObservation,storeIncidentObservation} from './incident-observations.mjs';

export async function importIncidents(db,{sample,id,mode,scope,now=Date.now()}) {
  if(!['--dry-run','--apply'].includes(mode)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??''))throw new Error('INCIDENTS_USAGE');
  if(scope?.provider!=='bsd'||['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k]))throw new Error('INCIDENTS_INVALID_SCOPE');
  if(!sample||(sample.failed!==undefined&&sample.failed!==true)||(sample.failed&&sample.body!==undefined))throw new Error('INCIDENTS_INVALID_SAMPLE');
  const failed=sample.failed===true,eventId=failed?sample.event_id:sample.body?.event_id;
  normalizeIncidents(failed?{event_id:eventId,incidents:[]}:sample.body,{eventId,fetchedAt:sample.fetched_at,now});
  const snapshot=await readTeamFixtures(db,{...scope,ttlMs:1,now});
  if(snapshot.status==='error'||snapshot.partial)throw new Error('INCIDENTS_LOOKUP_FAILED');
  const matches=(snapshot.data??[]).filter(f=>f.external_id===String(eventId));
  if(matches.length!==1)throw new Error('INCIDENTS_OUT_OF_SCOPE');
  const fixture=matches[0];
  if(fixture.provider!==scope.provider||fixture.competition_external_id!==scope.competitionId||fixture.season_external_id!==scope.seasonId||
    ![fixture.home_external_id,fixture.away_external_id].includes(scope.externalTeamId))throw new Error('INCIDENTS_OUT_OF_SCOPE');
  const row=createIncidentObservation({id,fixture,body:failed?undefined:sample.body,failed,observedAt:sample.fetched_at,now});
  const result=mode==='--apply'?await storeIncidentObservation(db,row,{now}):null;
  return {mode,id,fixture_id:fixture.id,event_id:fixture.external_id,status:row.status,observed_at:row.observed_at,provider_requests:0,result};
}
