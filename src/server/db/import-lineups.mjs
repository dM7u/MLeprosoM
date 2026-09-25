import 'server-only';
import {readTeamFixtures} from './read-fixtures.mjs';
import {normalizeLineups} from '../providers/bsd/lineups.mjs';
import {createLineupObservation,storeLineupObservation} from './lineup-observations.mjs';

export async function importLineups(db,{sample,id,mode,scope,now=Date.now()}) {
  if(!['--dry-run','--apply'].includes(mode)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??''))throw new Error('LINEUPS_USAGE');
  if(scope?.provider!=='bsd'||['externalTeamId','competitionId','seasonId'].some(k=>typeof scope[k]!=='string'||!scope[k]))throw new Error('LINEUPS_INVALID_SCOPE');
  const body=sample?.body;
  normalizeLineups(body,{eventId:body?.event_id,homeTeamId:body?.lineups?.home?.team_id,
    awayTeamId:body?.lineups?.away?.team_id,fetchedAt:sample?.fetched_at,now});
  const snapshot=await readTeamFixtures(db,{...scope,ttlMs:1,now});
  if(snapshot.status==='error'||snapshot.partial)throw new Error('LINEUPS_LOOKUP_FAILED');
  const matches=(snapshot.data??[]).filter(f=>f.external_id===String(body.event_id));
  if(matches.length!==1)throw new Error('LINEUPS_OUT_OF_SCOPE');
  const fixture=matches[0];
  if(fixture.provider!==scope.provider||fixture.competition_external_id!==scope.competitionId||fixture.season_external_id!==scope.seasonId||
    ![fixture.home_external_id,fixture.away_external_id].includes(scope.externalTeamId))throw new Error('LINEUPS_OUT_OF_SCOPE');
  const row=createLineupObservation({id,fixture,body,observedAt:sample.fetched_at,now});
  const result=mode==='--apply'?await storeLineupObservation(db,row,{now}):null;
  return {mode,id,fixture_id:fixture.id,event_id:fixture.external_id,status:row.status,observed_at:row.observed_at,provider_requests:0,result};
}
